import { Injectable, Logger } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type { CreateOrder, CreateOrderResponse, VerifyPayment } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RazorpayService } from './razorpay.service';
import { EntitlementService } from './entitlement.service';
import { NotificationService } from '../notifications/notification.service';
import { paymentReceiptEmail, refundApprovedEmail, refundProcessedEmail, refundRejectedEmail, refundRequestReceivedEmail } from '../notifications/email-templates/payments';
import { BillingService } from '../billing/billing.service';
import { SettlementsService } from '../settlements/settlements.service';
import { renderOrderReceiptPdf } from '../common/pdf/pdf.util';
import { AppError } from '../common/errors/app-error';

// Academic Head refund requests at or below this auto-approve; above it (or
// on an already-settled order) always escalates to Super Admin — matches the
// profit-model prototype's "separation of duties" governance note.
const REFUND_AUTO_APPROVAL_CEILING_MINOR = 200_000; // ₹2,000

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('Payments');

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly razorpay: RazorpayService,
    private readonly entitlements: EntitlementService,
    private readonly notifications: NotificationService,
    private readonly billing: BillingService,
    private readonly settlements: SettlementsService,
  ) {}

  /** Public, unauthenticated listing — PUBLIC-audience only. Institute prices
   *  must never leak here; a logged-in student's institute price is resolved
   *  separately via student.service.ts's course-pricing lookup. */
  async listProducts() {
    const products = await this.prisma.product.findMany({ where: { active: true, audience: 'PUBLIC' }, orderBy: { priceMinor: 'asc' } });
    return products.map((p) => ({
      id: p.id,
      kind: p.kind,
      courseId: p.courseId,
      examId: p.examId,
      titleHi: p.titleHi,
      titleEn: p.titleEn,
      priceMinor: p.priceMinor,
      originalPriceMinor: p.originalPriceMinor,
      currency: p.currency,
      validityDays: p.validityDays,
      accessType: p.accessType,
      audience: p.audience,
    }));
  }

  async createOrder(principal: Principal, dto: CreateOrder): Promise<CreateOrderResponse> {
    if (principal.kind !== 'STUDENT') throw AppError.permissionDenied('Student account required.');

    // Idempotency: reuse an existing order for the same key.
    if (dto.idempotencyKey) {
      const existing = await this.prisma.order.findUnique({ where: { idempotencyKey: dto.idempotencyKey }, include: { product: true } });
      if (existing && existing.providerOrderId) {
        return {
          orderId: existing.id,
          providerOrderId: existing.providerOrderId,
          amountMinor: existing.amountMinor,
          currency: existing.currency,
          razorpayKeyId: this.razorpay.keyId,
          productTitle: existing.product.titleEn,
        };
      }
    }

    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, active: true }, include: { course: { include: { organization: true } } } });
    if (!product) throw AppError.notFound('Product not available.');
    if (product.audience === 'INSTITUTE') {
      const ownerOrgId = product.course?.orgId;
      const isMember = !!ownerOrgId && principal.orgId === ownerOrgId;
      const codeMatches =
        !!ownerOrgId &&
        !!dto.accessCode &&
        !!product.course?.organization?.accessCode &&
        product.course.organization.accessCode === dto.accessCode.trim();
      if (!isMember && !codeMatches) {
        throw AppError.permissionDenied('This price is only available to enrolled students of the owning institution.');
      }
    }

    const { amountMinor, coupon } = await this.applyCoupon(principal.userId, product.priceMinor, dto.couponCode, product.courseId);

    const order = await this.prisma.order.create({
      data: {
        userId: principal.userId,
        productId: product.id,
        amountMinor,
        currency: product.currency,
        status: 'CREATED',
        couponId: coupon?.id ?? null,
        idempotencyKey: dto.idempotencyKey ?? null,
      },
    });

    const providerOrderId = await this.razorpay.createOrder(amountMinor, product.currency, order.id);
    await this.prisma.$transaction([
      this.prisma.order.update({ where: { id: order.id }, data: { providerOrderId, status: 'PENDING' } }),
      this.prisma.payment.create({
        data: { orderId: order.id, providerOrderId, status: 'CREATED', amountMinor, currency: product.currency },
      }),
    ]);
    await this.audit.record({ actorUserId: principal.userId, action: 'order.created', targetType: 'Order', targetId: order.id, result: 'SUCCESS', after: { amountMinor, productId: product.id } });

    return { orderId: order.id, providerOrderId, amountMinor, currency: product.currency, razorpayKeyId: this.razorpay.keyId, productTitle: product.titleEn };
  }

  /** Backend re-verifies the HMAC — the frontend callback alone is never trusted. */
  async verify(principal: Principal, dto: VerifyPayment) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId: principal.userId },
      include: { product: true, payments: true },
    });
    if (!order || !order.providerOrderId) throw AppError.notFound('Order not found.');
    if (order.status === 'PAID') return { status: 'PAID', alreadyProcessed: true };

    const ok = this.razorpay.verifyPaymentSignature(order.providerOrderId, dto.razorpayPaymentId, dto.razorpaySignature);
    if (!ok) {
      await this.audit.record({ actorUserId: principal.userId, action: 'payment.verify', targetType: 'Order', targetId: order.id, result: 'FAILED', reasonCode: 'PAYMENT_SIGNATURE_INVALID' });
      throw AppError.paymentSignatureInvalid();
    }
    await this.markPaid(order.id, dto.razorpayPaymentId);
    return { status: 'PAID' };
  }

  /** Idempotent webhook: unique provider event id guards against double-processing. */
  async handleWebhook(rawBody: string, signature: string, eventId: string) {
    if (!this.razorpay.verifyWebhookSignature(rawBody, signature)) {
      throw AppError.paymentSignatureInvalid('Invalid webhook signature.');
    }
    const event = JSON.parse(rawBody) as {
      event: string;
      payload?: {
        payment?: { entity?: { id?: string; order_id?: string } };
        subscription?: { entity?: { id?: string } };
        account?: { entity?: { id?: string } };
      };
    };

    try {
      await this.prisma.paymentEvent.create({ data: { providerEventId: eventId, type: event.event, payload: event as object } });
    } catch {
      // Unique violation → already processed. Idempotent no-op.
      return { received: true, duplicate: true };
    }

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const providerOrderId = event.payload?.payment?.entity?.order_id;
      const paymentId = event.payload?.payment?.entity?.id;
      if (providerOrderId) {
        const order = await this.prisma.order.findUnique({ where: { providerOrderId } });
        if (order && order.status !== 'PAID') await this.markPaid(order.id, paymentId);
      }
    } else if (event.event.startsWith('subscription.')) {
      // Institution → platform recurring billing (distinct from student order payments above).
      await this.billing.handleSubscriptionEvent(event.event, event.payload ?? {});
    } else if (event.event.startsWith('account.')) {
      // Razorpay Route linked-account KYC lifecycle for an institute's payouts.
      await this.settlements.handleAccountEvent(event.event, event.payload ?? {});
    }
    await this.prisma.paymentEvent.updateMany({ where: { providerEventId: eventId }, data: { processedAt: new Date() } });
    return { received: true };
  }

  async listMyOrders(principal: Principal) {
    const orders = await this.prisma.order.findMany({
      where: { userId: principal.userId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => ({ id: o.id, status: o.status, amountMinor: o.amountMinor, product: o.product.titleEn, createdAt: o.createdAt.toISOString() }));
  }

  /** Admin (payment.manage): recent orders across the platform, optionally
   *  filtered to a single institution (by the buyer's org). */
  async adminListOrders(orgId?: string) {
    const orders = await this.prisma.order.findMany({
      where: orgId ? { user: { orgId } } : {},
      include: {
        product: { select: { titleHi: true, titleEn: true } },
        user: { select: { displayName: true, email: true, phone: true, org: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return orders.map((o) => ({
      id: o.id,
      status: o.status,
      amountMinor: o.amountMinor,
      productHi: o.product.titleHi,
      productEn: o.product.titleEn,
      buyer: o.user.displayName ?? o.user.email ?? o.user.phone ?? '—',
      institution: o.user.org?.name ?? null,
      createdAt: o.createdAt.toISOString(),
    }));
  }

  /** Academic Head's "Student Payments" ledger — orders for THIS institute's
   *  courses (by course.orgId, i.e. who they were sold by), not by the
   *  buyer's own org — an institute's course can be bought by internal
   *  members and external marketplace students alike. */
  async academicListOrders(orgId: string) {
    const orders = await this.prisma.order.findMany({
      where: { product: { course: { orgId } } },
      include: {
        product: { select: { titleHi: true, titleEn: true, audience: true } },
        user: { select: { displayName: true, email: true, phone: true, orgId: true } },
        payments: { where: { status: 'PAID' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return orders.map((o) => ({
      id: o.id,
      status: o.status,
      amountMinor: o.amountMinor,
      productHi: o.product.titleHi,
      productEn: o.product.titleEn,
      channel: o.product.audience,
      buyer: o.user.displayName ?? o.user.email ?? o.user.phone ?? '—',
      isInternal: o.user.orgId === orgId,
      paymentId: o.payments[0]?.id ?? null,
      createdAt: o.createdAt.toISOString(),
    }));
  }

  /** Shared lookup for receipt PDFs — callers enforce their own scope check
   *  (self, org-owning-the-course, or platform-wide for Super Admin) before
   *  rendering, since this returns full buyer/payment details. */
  async getOrderForReceipt(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        product: { include: { course: { select: { orgId: true } } } },
        user: { select: { displayName: true, email: true, phone: true } },
        payments: { where: { status: 'PAID' }, orderBy: { paidAt: 'desc' }, take: 1 },
      },
    });
    if (!order) throw AppError.notFound('Order not found.');
    if (order.status !== 'PAID') throw AppError.conflict('Receipt is only available for paid orders.');
    return order;
  }

  async renderReceiptPdf(order: Awaited<ReturnType<PaymentsService['getOrderForReceipt']>>): Promise<Buffer> {
    const payment = order.payments[0] ?? null;
    return renderOrderReceiptPdf({
      receiptNumber: `RCPT-${order.id.slice(0, 8).toUpperCase()}`,
      sellerName: order.product.audience === 'INSTITUTE' ? 'RajyaRank (on behalf of the owning institute)' : 'RajyaRank',
      studentName: order.user.displayName ?? order.user.email ?? order.user.phone ?? 'Student',
      productTitle: order.product.titleEn,
      amountMinor: order.amountMinor,
      paidAt: payment?.paidAt ?? order.updatedAt,
      providerPaymentId: payment?.providerPaymentId ?? null,
    });
  }

  /** Shared execution — marks the payment/order refunded, revokes the
   *  entitlement on a full refund, and reverses any settled transfer. Used by
   *  both a direct Super Admin refund and approving a pending request; never
   *  creates/updates the Refund row itself, since the two callers need that
   *  row handled differently (create vs. update-in-place). */
  private async applyRefundEffects(paymentId: string, amountMinor: number): Promise<{ full: boolean; orderId: string }> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw AppError.notFound('Payment not found.');
    if (payment.status !== 'PAID' && payment.status !== 'REFUNDED_PARTIAL') {
      throw AppError.conflict('Only paid payments can be refunded.');
    }
    const full = amountMinor >= payment.amountMinor;
    await this.prisma.$transaction([
      this.prisma.payment.update({ where: { id: paymentId }, data: { status: full ? 'REFUNDED_FULL' : 'REFUNDED_PARTIAL' } }),
      this.prisma.order.update({ where: { id: payment.orderId }, data: { status: full ? 'REFUNDED_FULL' : 'REFUNDED_PARTIAL' } }),
      // Revoke access on full refund (entitlement is keyed by user+product via the order).
      ...(full ? [this.prisma.entitlement.updateMany({ where: { orderId: payment.orderId }, data: { status: 'REFUNDED' } })] : []),
    ]);
    await this.settlements.reverseTransferForOrder(payment.orderId);
    return { full, orderId: payment.orderId };
  }

  /** Direct Super Admin refund — executes immediately, no approval step.
   *  Also used as the final execution step for an auto-approved Academic
   *  Head request (see requestRefund below) — always creates a fresh Refund
   *  row, since neither path has a pre-existing pending one. */
  async refund(admin: Principal, dto: { paymentId: string; amountMinor?: number; reason?: string }, requestedBy?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: dto.paymentId }, include: { order: true } });
    if (!payment) throw AppError.notFound('Payment not found.');
    const amount = dto.amountMinor ?? payment.amountMinor;
    const { full } = await this.applyRefundEffects(dto.paymentId, amount);

    const refund = await this.prisma.refund.create({
      data: { paymentId: payment.id, amountMinor: amount, reason: dto.reason ?? null, status: 'PROCESSED', createdBy: admin.userId, requestedBy: requestedBy ?? null, approvedBy: admin.userId },
    });
    await this.notifications.emit({
      userId: payment.order.userId,
      category: 'PAYMENT',
      titleHi: 'धनवापसी संसाधित हुई',
      titleEn: 'Refund processed',
      bodyHi: 'आपकी धनवापसी संसाधित कर दी गई है।',
      bodyEn: 'Your refund has been processed.',
      data: { paymentId: payment.id },
      email: (locale) => refundProcessedEmail(locale, amount, payment.currency, full),
    });
    await this.audit.record({
      actorUserId: admin.userId,
      actorRole: admin.roleKeys.join(','),
      action: 'payment.refunded',
      targetType: 'Payment',
      targetId: payment.id,
      result: 'SUCCESS',
      after: { amountMinor: amount, full },
    });
    return { id: refund.id, status: refund.status, full };
  }

  /** Academic Head requests a refund for one of their institute's orders.
   *  Auto-approved (executes immediately) when under the ceiling and the
   *  order hasn't already been settled to the institute; otherwise creates a
   *  PENDING_APPROVAL record that only Super Admin can act on. */
  async requestRefund(principal: Principal, dto: { paymentId: string; amountMinor?: number; reason?: string }) {
    if (!principal.orgId) throw AppError.permissionDenied('No institution assigned.');
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
      include: { order: { include: { product: { include: { course: true } } } } },
    });
    if (!payment) throw AppError.notFound('Payment not found.');
    if (payment.order.product.course?.orgId !== principal.orgId) {
      throw AppError.permissionDenied('This order is not part of your institution.');
    }
    if (payment.status !== 'PAID' && payment.status !== 'REFUNDED_PARTIAL') {
      throw AppError.conflict('Only paid payments can be refunded.');
    }

    const amount = dto.amountMinor ?? payment.amountMinor;
    const alreadySettled = await this.settlements.hasProcessedTransfer(payment.orderId);
    const needsApproval = alreadySettled || amount > REFUND_AUTO_APPROVAL_CEILING_MINOR;

    if (!needsApproval) {
      return this.refund(principal, dto, principal.userId);
    }

    const refund = await this.prisma.refund.create({
      data: { paymentId: payment.id, amountMinor: amount, reason: dto.reason ?? null, status: 'PENDING_APPROVAL', requestedBy: principal.userId },
    });
    const buyer = await this.prisma.user.findUnique({ where: { id: payment.order.userId }, select: { displayName: true, email: true, phone: true } });
    const buyerLabel = buyer?.displayName ?? buyer?.email ?? buyer?.phone ?? '—';
    const superAdmins = await this.prisma.user.findMany({
      where: { kind: 'STAFF', deletedAt: null, roles: { some: { role: { key: 'SUPER_ADMIN' } } } },
      select: { id: true },
    });
    await Promise.all(
      superAdmins.map((sa) =>
        this.notifications.emit({
          userId: sa.id,
          category: 'PAYMENT',
          titleHi: 'धनवापसी अनुरोध लंबित',
          titleEn: 'Refund request pending approval',
          bodyHi: `${buyerLabel} की ओर से एक धनवापसी अनुरोध आपकी स्वीकृति का इंतज़ार कर रहा है।`,
          bodyEn: `A refund request from ${buyerLabel} is awaiting your approval.`,
          data: { refundId: refund.id },
          email: (locale) => refundRequestReceivedEmail(locale, amount, payment.currency, buyerLabel, payment.order.product.titleEn),
        }),
      ),
    );
    await this.audit.record({
      actorUserId: principal.userId,
      actorRole: principal.roleKeys.join(','),
      action: 'payment.refund_requested',
      targetType: 'Payment',
      targetId: payment.id,
      result: 'SUCCESS',
      after: { amountMinor: amount, reason: alreadySettled ? 'already_settled' : 'above_ceiling' },
    });
    return { id: refund.id, status: refund.status, full: amount >= payment.amountMinor };
  }

  async approveRefund(admin: Principal, refundId: string) {
    const pending = await this.prisma.refund.findUnique({ where: { id: refundId }, include: { payment: { include: { order: true } } } });
    if (!pending) throw AppError.notFound('Refund request not found.');
    if (pending.status !== 'PENDING_APPROVAL') throw AppError.conflict('This request is not awaiting approval.');

    const { full } = await this.applyRefundEffects(pending.paymentId, pending.amountMinor);
    const updated = await this.prisma.refund.update({ where: { id: refundId }, data: { status: 'PROCESSED', approvedBy: admin.userId } });
    await this.notifications.emit({
      userId: pending.payment.order.userId,
      category: 'PAYMENT',
      titleHi: 'धनवापसी स्वीकृत',
      titleEn: 'Refund approved',
      bodyHi: 'आपकी धनवापसी स्वीकृत कर दी गई है।',
      bodyEn: 'Your refund has been approved.',
      data: { refundId },
      email: (locale) => refundApprovedEmail(locale, pending.amountMinor, pending.payment.currency),
    });
    await this.audit.record({
      actorUserId: admin.userId,
      actorRole: admin.roleKeys.join(','),
      action: 'payment.refund_approved',
      targetType: 'Refund',
      targetId: refundId,
      result: 'SUCCESS',
      after: { amountMinor: pending.amountMinor, full },
    });
    return { id: updated.id, status: updated.status, full };
  }

  async rejectRefund(admin: Principal, refundId: string, reason?: string) {
    const pending = await this.prisma.refund.findUnique({ where: { id: refundId }, include: { payment: { include: { order: true } } } });
    if (!pending) throw AppError.notFound('Refund request not found.');
    if (pending.status !== 'PENDING_APPROVAL') throw AppError.conflict('This request is not awaiting approval.');
    const updated = await this.prisma.refund.update({ where: { id: refundId }, data: { status: 'REJECTED', approvedBy: admin.userId, reason: reason ?? pending.reason } });
    await this.notifications.emit({
      userId: pending.payment.order.userId,
      category: 'PAYMENT',
      titleHi: 'धनवापसी अनुरोध अस्वीकृत',
      titleEn: 'Refund request rejected',
      bodyHi: 'आपका धनवापसी अनुरोध अस्वीकृत कर दिया गया है।',
      bodyEn: 'Your refund request was rejected.',
      data: { refundId },
      email: (locale) => refundRejectedEmail(locale, reason ?? pending.reason ?? undefined),
    });
    await this.audit.record({ actorUserId: admin.userId, action: 'payment.refund_rejected', targetType: 'Refund', targetId: refundId, result: 'SUCCESS' });
    return updated;
  }

  async listPendingRefundApprovals() {
    const rows = await this.prisma.refund.findMany({
      where: { status: 'PENDING_APPROVAL' },
      include: {
        payment: {
          include: {
            order: {
              include: {
                product: { include: { course: { include: { organization: true } } } },
                user: { select: { displayName: true, email: true, phone: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      paymentId: r.paymentId,
      amountMinor: r.amountMinor,
      reason: r.reason,
      productTitle: r.payment.order.product.titleEn,
      buyer: r.payment.order.user.displayName ?? r.payment.order.user.email ?? r.payment.order.user.phone ?? '—',
      orgId: r.payment.order.product.course?.organization?.id ?? null,
      orgName: r.payment.order.product.course?.organization?.name ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  private async markPaid(orderId: string, providerPaymentId?: string) {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { product: true, payments: true } });
    const payment = order.payments[0] ?? null;
    await this.prisma.$transaction([
      this.prisma.order.update({ where: { id: orderId }, data: { status: 'PAID' } }),
      ...(payment
        ? [
            this.prisma.payment.update({
              where: { id: payment.id },
              data: { status: 'PAID', providerPaymentId: providerPaymentId ?? payment.providerPaymentId, signatureVerifiedAt: new Date(), paidAt: new Date() },
            }),
          ]
        : []),
      ...(order.couponId ? [this.prisma.coupon.update({ where: { id: order.couponId }, data: { redeemedCount: { increment: 1 } } })] : []),
    ]);
    await this.entitlements.grantFromOrder(order, order.product, payment);
    await this.notifications.emit({
      userId: order.userId,
      category: 'PAYMENT',
      titleHi: 'भुगतान सफल',
      titleEn: 'Payment successful',
      bodyHi: `${order.product.titleHi} अब आपके खाते में सक्रिय है।`,
      bodyEn: `${order.product.titleEn} is now active in your account.`,
      data: { orderId },
      email: (locale) => paymentReceiptEmail(locale, order.product.titleHi, order.product.titleEn, order.amountMinor, order.currency),
    });
    await this.audit.record({ actorUserId: order.userId, action: 'payment.paid', targetType: 'Order', targetId: orderId, result: 'SUCCESS' });
    // Marketplace split/payout to the owning institute, if any — never lets a
    // settlement problem affect the payment/entitlement already granted above.
    await this.settlements.createTransferForOrder(orderId, providerPaymentId);
  }

  private async applyCoupon(userId: string, priceMinor: number, code: string | undefined, courseId: string | null) {
    if (!code) return { amountMinor: priceMinor, coupon: null };
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    const now = new Date();
    if (!coupon || !coupon.active) throw AppError.couponInvalid();
    if (coupon.validFrom && coupon.validFrom > now) throw AppError.couponInvalid('Coupon not yet active.');
    if (coupon.validTo && coupon.validTo < now) throw AppError.couponInvalid('Coupon expired.');
    if (coupon.courseId && courseId && coupon.courseId !== courseId) throw AppError.couponInvalid('Coupon not valid for this course.');
    if (coupon.maxRedemptions && coupon.redeemedCount >= coupon.maxRedemptions) throw AppError.couponInvalid('Coupon fully redeemed.');
    const usedByUser = await this.prisma.order.count({ where: { userId, couponId: coupon.id, status: 'PAID' } });
    if (usedByUser >= coupon.perUserLimit) throw AppError.couponInvalid('Coupon usage limit reached.');

    const discount = coupon.type === 'PERCENT' ? Math.round((priceMinor * coupon.value) / 100) : coupon.value;
    return { amountMinor: Math.max(0, priceMinor - discount), coupon };
  }
}
