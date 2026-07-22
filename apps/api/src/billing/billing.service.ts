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

  /** Subscribe an institution to a plan — creates the Razorpay plan+subscription
   *  (dev-fallback IDs when Razorpay Subscriptions isn't configured) and the
   *  local record that drives fee resolution for that org's student sales. */
  async subscribeOrganization(actor: Principal, orgId: string, dto: SubscribeOrganization) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw AppError.notFound('Institution not found.');
    if (!org.headUserId) throw AppError.conflict('This institution has no accepted Academic Head yet — it cannot be subscribed to a plan until the invited head accepts.');
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: dto.planId } });
    if (!plan || !plan.active) throw AppError.notFound('Plan not found or inactive.');

    const existing = await this.prisma.organizationSubscription.findUnique({ where: { orgId } });
    if (existing) throw AppError.conflict('This institution already has a subscription. Cancel it first to change plans.');

    const amountMinor = dto.billingCycle === 'MONTHLY' ? plan.priceMonthlyMinor : plan.priceAnnualMinor;
    const razorpayPlanId = await this.razorpay.createSubscriptionPlan({ nameEn: `${plan.nameEn} (${dto.billingCycle})`, amountMinor, cycle: dto.billingCycle });
    // 12 monthly charges or 5 annual renewals before requiring re-authorisation — a Razorpay Subscriptions requirement, not a business limit.
    const razorpaySubscriptionId = await this.razorpay.createSubscription(razorpayPlanId, dto.billingCycle === 'MONTHLY' ? 12 : 5);

    const now = new Date();
    const periodEnd = new Date(now);
    if (dto.billingCycle === 'MONTHLY') periodEnd.setMonth(periodEnd.getMonth() + 1);
    else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

    const subscription = await this.prisma.organizationSubscription.create({
      data: {
        orgId,
        planId: dto.planId,
        billingCycle: dto.billingCycle,
        status: 'ACTIVE',
        razorpaySubscriptionId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    await this.prisma.institutionInvoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(now),
        subscriptionId: subscription.id,
        periodLabel: dto.billingCycle === 'MONTHLY' ? now.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Annual',
        basePlanMinor: amountMinor,
        totalMinor: amountMinor,
        status: this.razorpay.configured ? 'PENDING' : 'PAID',
        dueAt: now,
        paidAt: this.razorpay.configured ? null : now,
      },
    });

    await this.audit.record({ actorUserId: actor.userId, action: 'billing.org_subscribed', targetType: 'Organization', targetId: orgId, result: 'SUCCESS', after: { planId: dto.planId, billingCycle: dto.billingCycle } });
    return subscription;
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
