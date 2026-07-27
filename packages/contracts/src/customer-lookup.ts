import { z } from 'zod';

// ── Customer Lookup (support.manage) ─────────────────────────────────────────
// Read-only, org-scoped aggregation of everything about one student — built
// so support staff never need direct database access to diagnose an issue.
// See apps/api/src/customer-lookup/customer-lookup.service.ts.

export const customerSearchResultSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string().nullable(),
  phone: z.string(),
  status: z.string(),
});
export type CustomerSearchResult = z.infer<typeof customerSearchResultSchema>;

export const customerOrderViewSchema = z.object({
  id: z.string(),
  productTitleHi: z.string(),
  productTitleEn: z.string(),
  amountMinor: z.number(),
  currency: z.string(),
  status: z.string(),
  couponCode: z.string().nullable(),
  createdAt: z.string(),
  payments: z.array(
    z.object({
      id: z.string(),
      status: z.string(),
      providerPaymentId: z.string().nullable(),
      paidAt: z.string().nullable(),
    }),
  ),
});

export const customerEntitlementViewSchema = z.object({
  id: z.string(),
  productTitleHi: z.string(),
  productTitleEn: z.string(),
  status: z.string(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
});

export const customerTicketViewSchema = z.object({
  id: z.string(),
  subject: z.string(),
  category: z.string(),
  status: z.string(),
  createdAt: z.string(),
  replyCount: z.number(),
});

export const customerDoubtViewSchema = z.object({
  id: z.string(),
  bodyText: z.string(),
  status: z.string(),
  createdAt: z.string(),
  replyCount: z.number(),
});

export const customerSessionViewSchema = z.object({
  id: z.string(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string(),
  lastUsedAt: z.string(),
});

export const customerActivityViewSchema = z.object({
  id: z.string(),
  action: z.string(),
  result: z.string(),
  createdAt: z.string(),
});

export const customerDetailSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string().nullable(),
  phone: z.string(),
  status: z.string(),
  orgName: z.string().nullable(),
  createdAt: z.string(),
  lastLoginAt: z.string().nullable(),
  orders: z.array(customerOrderViewSchema),
  entitlements: z.array(customerEntitlementViewSchema),
  tickets: z.array(customerTicketViewSchema),
  doubts: z.array(customerDoubtViewSchema),
  sessions: z.array(customerSessionViewSchema),
  activity: z.array(customerActivityViewSchema),
});
export type CustomerDetail = z.infer<typeof customerDetailSchema>;
