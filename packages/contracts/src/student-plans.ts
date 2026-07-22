import { z } from 'zod';

/** A student subscription plan is a `Product` row with `kind: 'SUBSCRIPTION'`.
 *  `examId: null` = Pro / all-access; `examId` set = Plus, scoped to that one
 *  exam. No new tables — see EntitlementService.hasCourseAccess for how this
 *  is checked at content-access time. */
export interface StudentPlanView {
  id: string;
  examId: string | null;
  examNameHi: string | null;
  examNameEn: string | null;
  titleHi: string;
  titleEn: string;
  priceMinor: number;
  originalPriceMinor: number | null;
  validityDays: number;
  active: boolean;
  createdAt: string;
}

export const upsertStudentPlanSchema = z.object({
  examId: z.string().uuid().nullable(),
  titleHi: z.string().min(1).max(120),
  titleEn: z.string().min(1).max(120),
  priceMinor: z.number().int().min(0),
  originalPriceMinor: z.number().int().min(0).nullable().optional(),
  validityDays: z.number().int().min(1),
  active: z.boolean().default(true),
});
export type UpsertStudentPlan = z.infer<typeof upsertStudentPlanSchema>;
