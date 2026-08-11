import { Injectable, Logger } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type { ConfirmPaymentMethod, SavedPaymentMethodView, SetupPaymentMethodResponse } from '@rajyarank/contracts';
import type { SavedPaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RazorpayService } from '../payments/razorpay.service';
import { AppError } from '../common/errors/app-error';

/** Nominal authorization used to mint a card token — refunded immediately
 *  after. There is no zero-cost way to tokenize a card; this ₹1 hold-and-
 *  refund is Razorpay's standard pattern (same one Zomato/Swiggy etc. use). */
const VERIFICATION_AMOUNT_MINOR = 100;
const MAX_SAVED_CARDS = 5;

/** Same model, same endpoints, for both students and staff — nothing here is
 *  role-specific, the caller's own userId scopes everything. Card data itself
 *  never reaches this service: Razorpay's hosted Checkout collects the PAN/
 *  CVV directly, we only ever handle the resulting token + masked metadata
 *  (see razorpay.service.ts's getPaymentTokenId/getTokenCard). */
@Injectable()
export class PaymentMethodsService {
  private readonly logger = new Logger('PaymentMethods');

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly razorpay: RazorpayService,
  ) {}

  async list(userId: string): Promise<SavedPaymentMethodView[]> {
    const rows = await this.prisma.savedPaymentMethod.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(toView);
  }

  private async ensureCustomer(actor: Principal): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
    if (user.razorpayCustomerId) return user.razorpayCustomerId;
    const customerId = await this.razorpay.createCustomer({
      name: user.displayName ?? undefined,
      email: user.email ?? undefined,
      contact: user.phone ?? undefined,
    });
    await this.prisma.user.update({ where: { id: user.id }, data: { razorpayCustomerId: customerId } });
    return customerId;
  }

  /** Step 1 of "add card": opens a nominal-amount Checkout order against the
   *  user's Razorpay Customer. The card isn't actually saved until confirm()
   *  reads back the token that a successful save:1 Checkout payment produces. */
  async setupIntent(actor: Principal): Promise<SetupPaymentMethodResponse> {
    const activeCount = await this.prisma.savedPaymentMethod.count({ where: { userId: actor.userId, deletedAt: null } });
    if (activeCount >= MAX_SAVED_CARDS) {
      throw AppError.conflict(`You can save up to ${MAX_SAVED_CARDS} cards. Remove one before adding another.`);
    }
    const razorpayCustomerId = await this.ensureCustomer(actor);
    // Razorpay caps `receipt` at 40 chars — a full uuid userId + timestamp
    // blows past that, so use a short user prefix instead of the whole id.
    const receipt = `pm-${actor.userId.slice(0, 8)}-${Date.now()}`;
    const providerOrderId = await this.razorpay.createOrder(VERIFICATION_AMOUNT_MINOR, 'INR', receipt);
    return {
      razorpayKeyId: this.razorpay.keyId,
      razorpayCustomerId,
      providerOrderId,
      amountMinor: VERIFICATION_AMOUNT_MINOR,
      currency: 'INR',
    };
  }

  /** Step 2: verifies the Checkout payment actually happened, reads the
   *  resulting token + masked card details, refunds the ₹1, and persists the
   *  saved card. Refund failure never blocks saving the card — a missed
   *  refund is a reconciliation issue, not a reason to lose the user's card. */
  async confirm(actor: Principal, dto: ConfirmPaymentMethod): Promise<SavedPaymentMethodView> {
    const ok = this.razorpay.verifyPaymentSignature(dto.razorpayOrderId, dto.razorpayPaymentId, dto.razorpaySignature);
    if (!ok) {
      await this.audit.record({
        actorUserId: actor.userId,
        action: 'payment_method.verify',
        targetType: 'SavedPaymentMethod',
        result: 'FAILED',
        reasonCode: 'PAYMENT_SIGNATURE_INVALID',
      });
      throw AppError.paymentSignatureInvalid();
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
    if (!user.razorpayCustomerId) throw AppError.conflict('No card-save session in progress — start over from Payment Methods.');

    const tokenId = await this.razorpay.getPaymentTokenId(dto.razorpayPaymentId);
    if (!tokenId) throw AppError.conflict('This payment did not produce a savable card — please try again.');

    const existing = await this.prisma.savedPaymentMethod.findUnique({ where: { razorpayTokenId: tokenId } });
    if (existing) {
      // A retried confirm call for a token we've already saved — refund and
      // return the existing row instead of erroring or duplicating it.
      await this.razorpay
        .refundPayment(dto.razorpayPaymentId, VERIFICATION_AMOUNT_MINOR)
        .catch((e) => this.logger.warn(`Refund failed for already-saved token ${tokenId}: ${(e as Error).message}`));
      return toView(existing);
    }

    const card = await this.razorpay.getTokenCard(user.razorpayCustomerId, tokenId);
    if (!card) throw AppError.conflict('Could not read the saved card details — please try again.');

    const isFirstCard = (await this.prisma.savedPaymentMethod.count({ where: { userId: actor.userId, deletedAt: null } })) === 0;
    const row = await this.prisma.savedPaymentMethod.create({
      data: {
        userId: actor.userId,
        razorpayTokenId: tokenId,
        cardLast4: card.last4,
        cardNetwork: card.network,
        cardType: card.type,
        cardIssuer: card.issuer,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        isDefault: isFirstCard,
      },
    });

    try {
      await this.razorpay.refundPayment(dto.razorpayPaymentId, VERIFICATION_AMOUNT_MINOR);
    } catch (e) {
      this.logger.error(`Refund failed for card-verification payment ${dto.razorpayPaymentId} (card ${row.id} still saved): ${(e as Error).message}`);
    }

    await this.audit.record({
      actorUserId: actor.userId,
      action: 'payment_method.added',
      targetType: 'SavedPaymentMethod',
      targetId: row.id,
      result: 'SUCCESS',
      after: { cardLast4: card.last4, cardNetwork: card.network },
    });
    return toView(row);
  }

  async setDefault(actor: Principal, id: string): Promise<{ ok: true }> {
    const row = await this.prisma.savedPaymentMethod.findFirst({ where: { id, userId: actor.userId, deletedAt: null } });
    if (!row) throw AppError.notFound('Saved card not found.');
    await this.prisma.$transaction([
      this.prisma.savedPaymentMethod.updateMany({ where: { userId: actor.userId, deletedAt: null }, data: { isDefault: false } }),
      this.prisma.savedPaymentMethod.update({ where: { id }, data: { isDefault: true } }),
    ]);
    return { ok: true };
  }

  /** Razorpay-side delete is best-effort — a failure there must never trap
   *  the user with a card they can't remove locally (same resilience pattern
   *  used for Route linked-account/subscription cancellation elsewhere). */
  async remove(actor: Principal, id: string): Promise<{ ok: true }> {
    const row = await this.prisma.savedPaymentMethod.findFirst({ where: { id, userId: actor.userId, deletedAt: null } });
    if (!row) throw AppError.notFound('Saved card not found.');

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
    if (user.razorpayCustomerId) {
      try {
        await this.razorpay.deleteToken(user.razorpayCustomerId, row.razorpayTokenId);
      } catch (e) {
        this.logger.warn(`Razorpay token delete failed for ${row.id} — removing locally anyway: ${(e as Error).message}`);
      }
    }
    await this.prisma.savedPaymentMethod.update({ where: { id }, data: { deletedAt: new Date() } });

    if (row.isDefault) {
      const next = await this.prisma.savedPaymentMethod.findFirst({ where: { userId: actor.userId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
      if (next) await this.prisma.savedPaymentMethod.update({ where: { id: next.id }, data: { isDefault: true } });
    }

    await this.audit.record({ actorUserId: actor.userId, action: 'payment_method.removed', targetType: 'SavedPaymentMethod', targetId: id, result: 'SUCCESS' });
    return { ok: true };
  }
}

function toView(row: SavedPaymentMethod): SavedPaymentMethodView {
  return {
    id: row.id,
    cardLast4: row.cardLast4,
    cardNetwork: row.cardNetwork,
    cardType: row.cardType,
    cardIssuer: row.cardIssuer,
    expiryMonth: row.expiryMonth,
    expiryYear: row.expiryYear,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
  };
}
