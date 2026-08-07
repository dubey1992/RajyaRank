import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Principal } from '@rajyarank/auth';
import type { UpsertSubscriptionPlan, SubscribeOrganization } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RazorpayService } from '../payments/razorpay.service';
import { NotifierService } from '../notifications/notifier.service';
import { institutionInvoiceEmail } from '../notifications/email-templates/payments';
import { renderInstitutionInvoicePdf } from '../common/pdf/pdf.util';
import { AppError } from '../common/errors/app-error';

function generateInvoiceNumber(date = new Date()): string {
  const ymd = date.toISOString().slice(2, 10).replace(/-/g, '');
  const suffix = randomBytes(2).toString('hex').toUpperCase();
  return `INV-RR-${ymd}-${suffix}`;
}

/** Institution → platform recurring billing (Super Admin sells institutions a
 *  licence). Distinct from student → institute course commerce (payments/). */
@Injectable()
export class BillingService {
  private readonly logger = new Logger('Billing');

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly razorpay: RazorpayService,
    private readonly notifier: NotifierService,
  ) {}

  // ── Plan catalog ──
  listPlans() {
    return this.prisma.subscriptionPlan.findMany({ orderBy: { sequence: 'asc' } });
  }

  /** Head-facing catalog — active plans only, no draft/retired codes shown. */
  listActivePlans() {
    return this.prisma.subscriptionPlan.findMany({ where: { active: true }, orderBy: { sequence: 'asc' } });
  }

  async createPlan(actor: Principal, dto: UpsertSubscriptionPlan) {
    const existing = await this.prisma.subscriptionPlan.findUnique({ where: { code: dto.code } });
    if (existing) throw AppError.conflict('A plan with this code already exists.');
    const plan = await this.prisma.subscriptionPlan.create({ data: dto });
    await this.audit.record({ actorUserId: actor.userId, action: 'billing.plan_created', targetType: 'SubscriptionPlan', targetId: plan.id, result: 'SUCCESS', after: dto });
    return plan;
  }

  async updatePlan(actor: Principal, id: string, dto: Partial<UpsertSubscriptionPlan>) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw AppError.notFound('Plan not found.');
    const updated = await this.prisma.subscriptionPlan.update({ where: { id }, data: dto });
    await this.audit.record({ actorUserId: actor.userId, action: 'billing.plan_updated', targetType: 'SubscriptionPlan', targetId: id, result: 'SUCCESS', after: dto });
    return updated;
  }

  // ── Institution subscriptions ──
  async listSubscriptions() {
    const rows = await this.prisma.organizationSubscription.findMany({
      include: { organization: { select: { name: true } }, plan: { select: { nameHi: true, nameEn: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((s) => ({
      id: s.id,
      orgId: s.orgId,
      orgName: s.organization.name,
      planId: s.planId,
      planNameHi: s.plan.nameHi,
      planNameEn: s.plan.nameEn,
      billingCycle: s.billingCycle,
      status: s.status,
      razorpaySubscriptionId: s.razorpaySubscriptionId,
      currentPeriodStart: s.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
    }));
  }

  /** Shared by the Super-Admin grant path and the Academic-Head self-serve
   *  path — creates the Razorpay plan+subscription (dev-fallback IDs when
   *  Razorpay Subscriptions isn't configured) and the local record that
   *  drives fee resolution for that org's student sales. Also handles
   *  renewal: a CANCELED/PAST_DUE existing row is replaced in place rather
   *  than blocked (Razorpay has no "resume a cancelled subscription" API, so
   *  renewal always means creating a fresh Subscription object).
   *
   *  `settledImmediately` distinguishes two real situations rather than one
   *  invoice-status bug: a Super Admin manually granting access already put
   *  the org's `OrganizationSubscription.status` at ACTIVE unconditionally
   *  below, so the invoice must agree it's PAID, not dangle at PENDING
   *  forever with no checkout ever happening to clear it (that was the
   *  original bug — the very first invoice on every admin-granted org sat at
   *  PENDING permanently). A self-serve purchase, by contrast, really is
   *  awaiting a live Razorpay charge, so PENDING is correct there until the
   *  `subscription.charged` webhook confirms it. */
  private async provisionSubscription(
    actor: Principal,
    orgId: string,
    dto: SubscribeOrganization,
    opts: { settledImmediately: boolean },
  ) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw AppError.notFound('Institution not found.');
    if (!org.headUserId) throw AppError.conflict('This institution has no accepted Academic Head yet — it cannot be subscribed to a plan until the invited head accepts.');
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: dto.planId } });
    if (!plan || !plan.active) throw AppError.notFound('Plan not found or inactive.');

    const existing = await this.prisma.organizationSubscription.findUnique({ where: { orgId } });
    if (existing && existing.status === 'ACTIVE') {
      throw AppError.conflict('This institution already has an active subscription. Cancel it first to change plans.');
    }

    const amountMinor = dto.billingCycle === 'MONTHLY' ? plan.priceMonthlyMinor : plan.priceAnnualMinor;
    const razorpayPlanId = await this.razorpay.createSubscriptionPlan({ nameEn: `${plan.nameEn} (${dto.billingCycle})`, amountMinor, cycle: dto.billingCycle });
    // 12 monthly charges or 5 annual renewals before requiring re-authorisation — a Razorpay Subscriptions requirement, not a business limit.
    const razorpaySubscriptionId = await this.razorpay.createSubscription(razorpayPlanId, dto.billingCycle === 'MONTHLY' ? 12 : 5);

    const now = new Date();
    const periodEnd = new Date(now);
    if (dto.billingCycle === 'MONTHLY') periodEnd.setMonth(periodEnd.getMonth() + 1);
    else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

    const subscriptionData = {
      planId: dto.planId,
      billingCycle: dto.billingCycle,
      status: 'ACTIVE' as const,
      razorpaySubscriptionId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    };
    const subscription = existing
      ? await this.prisma.organizationSubscription.update({ where: { orgId }, data: subscriptionData })
      : await this.prisma.organizationSubscription.create({ data: { orgId, ...subscriptionData } });

    const invoicePaid = opts.settledImmediately || !this.razorpay.configured;
    await this.prisma.institutionInvoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(now),
        subscriptionId: subscription.id,
        periodLabel: dto.billingCycle === 'MONTHLY' ? now.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Annual',
        basePlanMinor: amountMinor,
        totalMinor: amountMinor,
        status: invoicePaid ? 'PAID' : 'PENDING',
        dueAt: now,
        paidAt: invoicePaid ? now : null,
      },
    });

    await this.audit.record({
      actorUserId: actor.userId,
      action: existing ? 'billing.org_renewed' : 'billing.org_subscribed',
      targetType: 'Organization',
      targetId: orgId,
      result: 'SUCCESS',
      after: { planId: dto.planId, billingCycle: dto.billingCycle },
    });
    return subscription;
  }

  /** Super Admin grants/renews an institution's licence directly — this is an
   *  administrative confirmation, not a live customer charge, so the invoice
   *  is recorded PAID immediately (see provisionSubscription's doc comment). */
  async subscribeOrganization(actor: Principal, orgId: string, dto: SubscribeOrganization) {
    return this.provisionSubscription(actor, orgId, dto, { settledImmediately: true });
  }

  /** Academic Head self-serve purchase/renewal for their own institution —
   *  gated on KYC verification so a Head can't unlock paid features before
   *  the institution is confirmed real. A live Razorpay charge is expected,
   *  so the invoice starts PENDING until the subscription.charged webhook
   *  confirms it (handleSubscriptionEvent below). */
  async selfServeSubscribe(actor: Principal, dto: SubscribeOrganization) {
    if (!actor.orgId) throw AppError.conflict('You are not linked to an institution.');
    const linkedAccount = await this.prisma.instituteLinkedAccount.findUnique({ where: { orgId: actor.orgId } });
    if (!linkedAccount || linkedAccount.kycStatus !== 'VERIFIED') {
      throw AppError.conflict('Complete your institution KYC verification before purchasing a subscription plan.');
    }
    return this.provisionSubscription(actor, actor.orgId, dto, { settledImmediately: false });
  }

  /** The calling Academic Head's own subscription + KYC status, for the
   *  self-serve Billing screen (browse plans vs. show current plan / renew).
   *  kycState is granular (not just a verified boolean) so the screen can
   *  tell a Head who has already submitted KYC and is awaiting review apart
   *  from one who hasn't submitted anything yet — those need different
   *  messages and, for NOT_SUBMITTED/REJECTED, a link back to /admin/earnings. */
  async getMySubscription(actor: Principal) {
    if (!actor.orgId) return { subscription: null, kycState: 'NOT_SUBMITTED' as const, kycRejectionReason: null };
    const [subscription, linkedAccount] = await Promise.all([
      this.prisma.organizationSubscription.findUnique({ where: { orgId: actor.orgId }, include: { plan: true } }),
      this.prisma.instituteLinkedAccount.findUnique({ where: { orgId: actor.orgId } }),
    ]);
    const kycState =
      linkedAccount?.kycStatus === 'VERIFIED'
        ? ('VERIFIED' as const)
        : linkedAccount?.kycStatus === 'REJECTED'
          ? ('REJECTED' as const)
          : linkedAccount?.kycSubmittedAt
            ? ('PENDING' as const)
            : ('NOT_SUBMITTED' as const);
    return {
      subscription: subscription
        ? {
            planId: subscription.planId,
            planNameHi: subscription.plan.nameHi,
            planNameEn: subscription.plan.nameEn,
            billingCycle: subscription.billingCycle,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
          }
        : null,
      kycState,
      kycRejectionReason: kycState === 'REJECTED' ? linkedAccount?.kycRejectionReason ?? null : null,
    };
  }

  listInvoices() {
    return this.prisma.institutionInvoice.findMany({
      include: { subscription: { include: { organization: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    }).then((rows) =>
      rows.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        orgName: i.subscription.organization.name,
        periodLabel: i.periodLabel,
        basePlanMinor: i.basePlanMinor,
        addOnsMinor: i.addOnsMinor,
        taxMinor: i.taxMinor,
        totalMinor: i.totalMinor,
        status: i.status,
        dueAt: i.dueAt.toISOString(),
        paidAt: i.paidAt?.toISOString() ?? null,
      })),
    );
  }

  /** Called from the shared Razorpay webhook handler for subscription.* /
   *  invoice.* events. Idempotency is already handled by the caller. */
  async handleSubscriptionEvent(eventType: string, payload: { subscription?: { entity?: { id?: string } } }) {
    const razorpaySubscriptionId = payload.subscription?.entity?.id;
    if (!razorpaySubscriptionId) return;
    const subscription = await this.prisma.organizationSubscription.findUnique({ where: { razorpaySubscriptionId }, include: { plan: true } });
    if (!subscription) return;

    if (eventType === 'subscription.charged') {
      const now = new Date();
      const periodEnd = new Date(subscription.currentPeriodEnd ?? now);
      if (subscription.billingCycle === 'MONTHLY') periodEnd.setMonth(periodEnd.getMonth() + 1);
      else periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      const amountMinor = subscription.billingCycle === 'MONTHLY' ? subscription.plan.priceMonthlyMinor : subscription.plan.priceAnnualMinor;
      await this.prisma.$transaction([
        this.prisma.organizationSubscription.update({
          where: { id: subscription.id },
          data: { status: 'ACTIVE', currentPeriodStart: now, currentPeriodEnd: periodEnd },
        }),
        // Each renewal charge is its own invoice — not just an updated period on the subscription.
        this.prisma.institutionInvoice.create({
          data: {
            invoiceNumber: generateInvoiceNumber(now),
            subscriptionId: subscription.id,
            periodLabel: subscription.billingCycle === 'MONTHLY' ? now.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Annual',
            basePlanMinor: amountMinor,
            totalMinor: amountMinor,
            status: 'PAID',
            dueAt: now,
            paidAt: now,
          },
        }),
      ]);
    } else if (eventType === 'subscription.cancelled') {
      await this.prisma.organizationSubscription.update({ where: { id: subscription.id }, data: { status: 'CANCELED' } });
    } else if (eventType === 'subscription.pending' || eventType === 'subscription.halted') {
      await this.prisma.organizationSubscription.update({ where: { id: subscription.id }, data: { status: 'PAST_DUE' } });
    }
  }

  async getInvoiceForPdf(id: string) {
    const invoice = await this.prisma.institutionInvoice.findUnique({
      where: { id },
      include: {
        subscription: {
          include: {
            organization: { include: { head: true } },
            plan: true,
          },
        },
      },
    });
    if (!invoice) throw AppError.notFound('Invoice not found.');
    const { subscription } = invoice;
    const { organization: org, plan } = subscription;
    return {
      ...invoice,
      orgName: org.name,
      orgCode: org.code,
      billingContactName: org.head?.displayName ?? null,
      billingContactEmail: org.head?.email ?? null,
      billingContactPhone: org.head?.phone ?? null,
      planNameEn: plan.nameEn,
      billingCycle: subscription.billingCycle,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      maxActiveStudents: plan.maxActiveStudents,
      maxStaffSeats: plan.maxStaffSeats,
      storageGb: plan.storageGb,
      paymentReference: invoice.razorpayInvoiceId ?? subscription.razorpaySubscriptionId ?? null,
    };
  }

  /** Shared by the PDF-download endpoint and the "send to Academic Head" email —
   *  one place that maps invoice data onto renderInstitutionInvoicePdf's shape. */
  async renderInvoicePdf(id: string) {
    const invoice = await this.getInvoiceForPdf(id);
    const pdf = await renderInstitutionInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      issuedAt: invoice.createdAt,
      orgName: invoice.orgName,
      orgCode: invoice.orgCode,
      billingContactName: invoice.billingContactName,
      billingContactEmail: invoice.billingContactEmail,
      billingContactPhone: invoice.billingContactPhone,
      planNameEn: invoice.planNameEn,
      billingCycle: invoice.billingCycle,
      periodLabel: invoice.periodLabel,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      maxActiveStudents: invoice.maxActiveStudents,
      maxStaffSeats: invoice.maxStaffSeats,
      storageGb: invoice.storageGb,
      basePlanMinor: invoice.basePlanMinor,
      addOnsMinor: invoice.addOnsMinor,
      taxMinor: invoice.taxMinor,
      totalMinor: invoice.totalMinor,
      status: invoice.status,
      dueAt: invoice.dueAt,
      paidAt: invoice.paidAt,
      paymentReference: invoice.paymentReference,
    });
    return { invoice, pdf };
  }

  /** Super Admin's "Send" action on the Institute Billing screen — emails the
   *  invoice PDF straight to the institution's Academic Head. */
  async sendInvoiceEmail(actor: Principal, id: string) {
    const { invoice, pdf } = await this.renderInvoicePdf(id);
    if (!invoice.billingContactEmail) {
      throw AppError.conflict('This institution has no Academic Head email on file yet.');
    }
    const { subject, html } = institutionInvoiceEmail('en', invoice.orgName, invoice.invoiceNumber, invoice.totalMinor, invoice.dueAt);
    await this.notifier.sendEmail({
      to: invoice.billingContactEmail,
      subject,
      html,
      locale: 'en',
      attachments: [{ filename: `${invoice.invoiceNumber}.pdf`, contentBase64: pdf.toString('base64'), contentType: 'application/pdf' }],
    });
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'billing.invoice_emailed',
      targetType: 'InstitutionInvoice',
      targetId: id,
      result: 'SUCCESS',
      after: { to: invoice.billingContactEmail },
    });
    return { sent: true, to: invoice.billingContactEmail };
  }
}
