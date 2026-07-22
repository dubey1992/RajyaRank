import { z } from 'zod';

export const currentAffairScopeSchema = z.enum(['NATIONAL', 'BIHAR', 'JHARKHAND']);
export type CurrentAffairScope = z.infer<typeof currentAffairScopeSchema>;

/** Current Affairs is a flat, single-row-per-item content type (no versions,
 *  no course/topic hierarchy) — deliberately a right-sized subset of the
 *  shared ContentStatus lesson enum (DRAFT/SUBMITTED/CORRECTION_REQUIRED/
 *  PUBLISHED/UNPUBLISHED/ARCHIVED), not the full lesson state machine. */
export interface CurrentAffairView {
  id: string;
  dateFor: string;
  titleHi: string;
  titleEn: string;
  bodyHi: string;
  bodyEn: string;
  category: string;
  scope: CurrentAffairScope;
  source: string | null;
  status: string;
  publishedAt: string | null;
  correctionReason: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export const upsertCurrentAffairSchema = z.object({
  dateFor: z.string().min(1), // YYYY-MM-DD, parsed server-side
  titleHi: z.string().min(1).max(200),
  titleEn: z.string().min(1).max(200),
  bodyHi: z.string().min(1),
  bodyEn: z.string().min(1),
  category: z.string().min(1).max(60),
  scope: currentAffairScopeSchema.default('NATIONAL'),
  source: z.string().max(300).optional(),
});
export type UpsertCurrentAffair = z.infer<typeof upsertCurrentAffairSchema>;
