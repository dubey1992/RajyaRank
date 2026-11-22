import { z } from 'zod';

/** Individual Content Purchase — a lesson, a standalone test, or a curated
 *  pack of several, each sellable on its own via an ordinary Product/Order/
 *  Entitlement, exactly like a whole course. See ProductKind LESSON/TEST/
 *  BUNDLE in schema.prisma. */
export type ContentProductKind = 'LESSON' | 'TEST' | 'BUNDLE';

export interface ContentProductView {
  id: string;
  kind: ContentProductKind;
  titleHi: string;
  titleEn: string;
  priceMinor: number;
  originalPriceMinor: number | null;
  currency: string;
  audience: 'PUBLIC' | 'INSTITUTE';
  // For LESSON/TEST: the single underlying lesson/test id. For BUNDLE: null —
  // see `items` instead.
  lessonId: string | null;
  testId: string | null;
  items?: { kind: 'LESSON' | 'TEST'; id: string; titleHi: string; titleEn: string }[];
}

export const upsertIndividualPricingSchema = z.object({
  enabled: z.boolean(),
  priceMinor: z.number().int().min(0),
  originalPriceMinor: z.number().int().min(0).optional(),
  audience: z.enum(['PUBLIC', 'INSTITUTE']).default('PUBLIC'),
});
export type UpsertIndividualPricingInput = z.infer<typeof upsertIndividualPricingSchema>;

export interface IndividualPricingView {
  enabled: boolean;
  productId: string | null;
  priceMinor: number | null;
  originalPriceMinor: number | null;
  audience: 'PUBLIC' | 'INSTITUTE' | null;
}

const packItemSchema = z.object({
  kind: z.enum(['LESSON', 'TEST']),
  id: z.string().min(1),
});

export const upsertContentPackSchema = z.object({
  titleHi: z.string().min(1),
  titleEn: z.string().min(1),
  priceMinor: z.number().int().min(0),
  originalPriceMinor: z.number().int().min(0).optional(),
  audience: z.enum(['PUBLIC', 'INSTITUTE']).default('PUBLIC'),
  active: z.boolean().default(true),
  // At least 2 items — a 1-item "pack" is just that item's own individual
  // price and should be set up as one instead.
  items: z.array(packItemSchema).min(2),
});
export type UpsertContentPackInput = z.infer<typeof upsertContentPackSchema>;

export interface ContentPackAdminView {
  id: string;
  titleHi: string;
  titleEn: string;
  priceMinor: number;
  originalPriceMinor: number | null;
  audience: 'PUBLIC' | 'INSTITUTE';
  active: boolean;
  items: { kind: 'LESSON' | 'TEST'; id: string; titleHi: string; titleEn: string }[];
}

/** Typeahead search results backing the pack item picker — lesson/test ids
 *  are raw UUIDs never otherwise shown in the admin UI, so staff search by
 *  title instead of needing to already have one. Scope (does this staff
 *  member actually manage this lesson/test) is enforced again, authoritatively,
 *  at pack create/update time (ContentProductsService#ensureItemProduct) —
 *  this search only needs to be helpful, not itself the security boundary. */
export interface ContentPackItemSearchResult {
  id: string;
  titleHi: string;
  titleEn: string;
  courseTitleHi: string | null;
  courseTitleEn: string | null;
}
