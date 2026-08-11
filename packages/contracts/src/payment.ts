import { z } from 'zod';
import { productAudienceSchema } from './common';

export interface ProductView {
  id: string;
  kind: string;
  courseId: string | null;
  examId: string | null;
  titleHi: string;
  titleEn: string;
  priceMinor: number;
  originalPriceMinor: number | null;
  currency: string;
  validityDays: number | null;
  accessType: string;
  audience: string;
}

export const createOrderSchema = z.object({
  // Not a strict UUID: some Product rows (demo/seed data) use human-readable
  // ids. The value is always server-generated and looked up as an opaque key.
  productId: z.string().min(1).max(80),
  couponCode: z.string().min(2).max(40).optional(),
  // Institute price redemption code — an alternate eligibility path to org
  // membership for INSTITUTE-audience products (see Organization.accessCode).
  accessCode: z.string().min(2).max(40).optional(),
  idempotencyKey: z.string().min(8).max(80).optional(),
});
export type CreateOrder = z.infer<typeof createOrderSchema>;

export interface CreateOrderResponse {
  orderId: string;
  // Null when no payment gateway order was created — see alreadyPaid below.
  providerOrderId: string | null;
  amountMinor: number;
  currency: string;
  razorpayKeyId: string;
  productTitle: string;
  // True for a free product (or a coupon that discounted it to zero): the
  // entitlement was already granted server-side and there is nothing to pay
  // — Razorpay rejects a zero-amount order outright, so this path never
  // goes near it. The client should skip opening Razorpay entirely.
  alreadyPaid?: boolean;
}

/** Frontend posts Razorpay's callback here; the backend re-verifies the HMAC. */
export const verifyPaymentSchema = z.object({
  orderId: z.string().uuid(),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});
export type VerifyPayment = z.infer<typeof verifyPaymentSchema>;

export interface EntitlementView {
  id: string;
  productId: string;
  productKind: string;
  productTitleHi: string;
  productTitleEn: string;
  courseId: string | null;
  source: string;
  status: string;
  accessType: string;
  startsAt: string;
  endsAt: string | null;
}

export const grantEntitlementSchema = z.object({
  userId: z.string().uuid(),
  productId: z.string().uuid(),
  source: z.enum(['ADMIN', 'SCHOLARSHIP', 'PROMOTION']).default('ADMIN'),
  reason: z.string().max(500).optional(),
  endsAt: z.string().datetime().optional(),
});

export const refundSchema = z.object({
  paymentId: z.string().uuid(),
  amountMinor: z.number().int().positive().optional(),
  reason: z.string().max(500).optional(),
});

export const rejectRefundSchema = z.object({ reason: z.string().max(500).optional() });
export type RejectRefund = z.infer<typeof rejectRefundSchema>;

/** Super Admin's queue of Academic Head refund requests awaiting approval. */
export interface PendingRefundView {
  id: string;
  paymentId: string;
  amountMinor: number;
  reason: string | null;
  productTitle: string;
  buyer: string;
  // Null for orders on platform-wide (non-institute) courses/products.
  orgId: string | null;
  orgName: string | null;
  createdAt: string;
}

/** Course-level pricing: sets/updates the single Product row backing a course's purchase. */
export const upsertCoursePricingSchema = z
  .object({
    titleHi: z.string().min(1).optional(),
    titleEn: z.string().min(1).optional(),
    priceMinor: z.number().int().min(0),
    originalPriceMinor: z.number().int().min(0).optional(),
    currency: z.string().length(3).default('INR'),
    validityDays: z.number().int().positive().optional(),
    accessType: z
      .enum(['FREE', 'PAID', 'TRIAL', 'SCHOLARSHIP', 'COUPON', 'ADMIN_GRANTED', 'LIFETIME', 'EXAM_CYCLE', 'SUBSCRIPTION'])
      .default('PAID'),
    active: z.boolean().default(true),
    audience: productAudienceSchema.default('PUBLIC'),
  })
  .refine((d) => !d.originalPriceMinor || d.originalPriceMinor >= d.priceMinor, {
    message: 'Original price must be at least the sale price.',
    path: ['originalPriceMinor'],
  })
  .refine((d) => d.accessType !== 'PAID' || d.priceMinor > 0, {
    message: 'A paid course must have a price greater than zero — use Free instead.',
    path: ['priceMinor'],
  });
export type UpsertCoursePricing = z.infer<typeof upsertCoursePricingSchema>;

export interface CoursePricingView {
  id: string | null;
  priceMinor: number;
  originalPriceMinor: number | null;
  currency: string;
  validityDays: number | null;
  accessType: string;
  active: boolean;
  audience: string;
}

/** A student's resolved view of a course's pricing: always sees the public
 *  price; sees the institute price too only when their orgId matches the
 *  course's owning institute. */
export interface CoursePricingResolved {
  public: CoursePricingView | null;
  institute: CoursePricingView | null;
  qualifiesForInstitute: boolean;
}

export const createCouponSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[A-Z0-9_]+$/, 'Uppercase letters, digits, underscores'),
  type: z.enum(['PERCENT', 'FIXED']),
  value: z.number().int().positive(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  maxRedemptions: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().default(1),
  courseId: z.string().uuid().optional(),
  active: z.boolean().default(true),
});
export type CreateCoupon = z.infer<typeof createCouponSchema>;

export interface CouponView {
  id: string;
  code: string;
  type: string;
  value: number;
  validFrom: string | null;
  validTo: string | null;
  maxRedemptions: number | null;
  perUserLimit: number;
  courseId: string | null;
  redeemedCount: number;
  active: boolean;
}

/** Academic Head's "Student Payments" ledger row — orders for their
 *  institute's courses, internal and external buyers alike. */
export interface AcademicOrderView {
  id: string;
  status: string;
  amountMinor: number;
  productHi: string;
  productEn: string;
  channel: string;
  buyer: string;
  isInternal: boolean;
  paymentId: string | null;
  createdAt: string;
}

// ── Saved payment methods (card tokenization, Profile Settings) ──
// Same model/endpoints for both students and staff — nothing role-specific.

/** Masked display only — never a PAN or CVV, those never reach our servers. */
export interface SavedPaymentMethodView {
  id: string;
  cardLast4: string;
  cardNetwork: string;
  cardType: string;
  cardIssuer: string | null;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  createdAt: string;
}

/** Response to "add card" step 1 — the frontend opens Razorpay Checkout
 *  against this nominal-amount order with save:1; the actual card token only
 *  exists after that payment is confirmed (see confirmSavePaymentMethod). */
export interface SetupPaymentMethodResponse {
  razorpayKeyId: string;
  razorpayCustomerId: string;
  providerOrderId: string;
  amountMinor: number;
  currency: string;
}

export const confirmPaymentMethodSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});
export type ConfirmPaymentMethod = z.infer<typeof confirmPaymentMethodSchema>;
