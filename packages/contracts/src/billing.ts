import { z } from 'zod';

export const billingCycleSchema = z.enum(['MONTHLY', 'ANNUAL']);
export type BillingCycleValue = z.infer<typeof billingCycleSchema>;

export interface SubscriptionPlanView {
  id: string;
  code: string;
  nameHi: string;
  nameEn: string;
  priceMonthlyMinor: number;
  priceAnnualMinor: number;
  maxActiveStudents: number;
  maxStaffSeats: number;
  storageGb: number;
  internalFeeBps: number;
  externalFeeBps: number;
  active: boolean;
  sequence: number;
}

export const upsertSubscriptionPlanSchema = z.object({
  code: z.string().min(2).max(40).regex(/^[A-Z0-9_]+$/, 'Uppercase letters, digits, underscores'),
  nameHi: z.string().min(1).max(80),
  nameEn: z.string().min(1).max(80),
  priceMonthlyMinor: z.number().int().min(0),
  priceAnnualMinor: z.number().int().min(0),
  maxActiveStudents: z.number().int().min(1),
  maxStaffSeats: z.number().int().min(1),
  storageGb: z.number().int().min(1),
  internalFeeBps: z.number().int().min(0).max(10000),
  externalFeeBps: z.number().int().min(0).max(10000),
  active: z.boolean().default(true),
  sequence: z.number().int().min(0).default(0),
});
export type UpsertSubscriptionPlan = z.infer<typeof upsertSubscriptionPlanSchema>;

export const subscribeOrganizationSchema = z.object({
  planId: z.string().uuid(),
  billingCycle: billingCycleSchema,
});
export type SubscribeOrganization = z.infer<typeof subscribeOrganizationSchema>;

/** POST /academic/billing/subscribe response — checkoutUrl is Razorpay's own
 *  hosted page where the Head actually authorizes payment; the subscription
 *  isn't real (no platform access unlocked) until they complete it there. */
export interface SelfServeSubscribeResult {
  subscriptionId: string;
  checkoutUrl: string | null;
}

export interface OrganizationSubscriptionView {
  id: string;
  orgId: string;
  orgName: string;
  planId: string;
  planNameHi: string;
  planNameEn: string;
  billingCycle: BillingCycleValue;
  status: string;
  razorpaySubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}

/** Academic Head's own-institution billing summary — GET /academic/billing/subscription. */
export interface MySubscriptionView {
  subscription: {
    planId: string;
    planNameHi: string;
    planNameEn: string;
    billingCycle: BillingCycleValue;
    status: string;
    currentPeriodEnd: string | null;
  } | null;
  kycState: 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  /** Set only when kycState is REJECTED. */
  kycRejectionReason: string | null;
}

export interface InstitutionInvoiceView {
  id: string;
  invoiceNumber: string;
  orgName: string;
  periodLabel: string;
  basePlanMinor: number;
  addOnsMinor: number;
  taxMinor: number;
  totalMinor: number;
  status: string;
  dueAt: string;
  paidAt: string | null;
}
