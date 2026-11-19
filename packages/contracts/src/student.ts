import { z } from 'zod';
import { localeSchema } from './common';
import type { MistakeType } from './test';

export const qualificationSchema = z.enum(['10TH', '12TH', 'GRADUATE', 'POSTGRADUATE', 'TECHNICAL']);

export const onboardingSchema = z
  .object({
    stateId: z.string().uuid(),
    // Either a catalog exam or a free-text name a student typed themselves —
    // see customExamName's doc comment on StudentProfile in schema.prisma.
    targetExamId: z.string().uuid().optional(),
    customExamName: z.string().trim().min(2).max(200).optional(),
    qualification: qualificationSchema,
    locale: localeSchema.optional(),
    dailyStudyMinutes: z.number().int().min(15).max(720),
    targetDate: z.string().datetime().optional(),
    preferredSubjects: z.array(z.string()).default([]),
  })
  .refine((d) => d.targetExamId || d.customExamName, { message: 'Select an exam or enter your own.', path: ['targetExamId'] });
export type Onboarding = z.infer<typeof onboardingSchema>;

/** Onboarding captures these once; this lets a student revisit them any time
 *  afterwards (previously nowhere in the product could they be changed) — or,
 *  if onboarding was skipped, fill them in for the first time here instead. */
export const updateGoalsSchema = z
  .object({
    stateId: z.string().uuid().optional(),
    targetExamId: z.string().uuid().nullable().optional(),
    customExamName: z.string().trim().min(2).max(200).nullable().optional(),
    qualification: qualificationSchema.optional(),
    dailyStudyMinutes: z.number().int().min(15).max(720).optional(),
    targetDate: z.string().datetime().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update.' });
export type UpdateGoals = z.infer<typeof updateGoalsSchema>;

export const joinInstitutionSchema = z.object({ accessCode: z.string().min(2).max(40) });
export type JoinInstitution = z.infer<typeof joinInstitutionSchema>;
export interface JoinInstitutionResponse {
  orgId: string;
  orgName: string;
}

export const planItemStatusUpdateSchema = z.object({ status: z.enum(['DONE', 'SKIPPED']) });
export type PlanItemStatusUpdate = z.infer<typeof planItemStatusUpdateSchema>;

export const planItemRescheduleSchema = z.object({ toDate: z.string().datetime() });
export type PlanItemReschedule = z.infer<typeof planItemRescheduleSchema>;

export interface PlanItemView {
  id: string;
  kind: 'LESSON' | 'WEAK_TOPIC_DRILL' | 'MISTAKE_DRILL' | 'TEST' | 'CUSTOM';
  status: 'PENDING' | 'DONE' | 'SKIPPED' | 'MISSED' | 'RESCHEDULED';
  titleHi: string;
  titleEn: string;
  lessonId: string | null;
  topicId: string | null;
  /** Set for MISTAKE_DRILL slots — the remediation target's concept id. */
  conceptId: string | null;
  /** Which mistake type drove a MISTAKE_DRILL slot, for display. */
  triggerMistakeType: MistakeType | null;
  /** Set for CUSTOM slots — the student-authored topic behind this item. */
  customTopicId: string | null;
  noteText: string | null;
  resourceUrl: string | null;
  resourceLabel: string | null;
  estimatedMinutes: number;
  freePreview: boolean;
}

export interface StudyPlanDay {
  date: string;
  items: PlanItemView[];
}

export interface StudyGoals {
  stateId: string | null;
  targetExamId: string | null;
  targetExamNameHi: string | null;
  targetExamNameEn: string | null;
  /** Free-text exam name when the student isn't preparing for a catalog exam. */
  customExamName: string | null;
  qualification: string | null;
  dailyStudyMinutes: number | null;
  targetDate: string | null;
}

export const customTopicInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  moduleName: z.string().trim().max(100).optional(),
  noteText: z.string().trim().max(5000).optional(),
  resourceUrl: z.string().trim().url().max(2000).optional(),
  resourceLabel: z.string().trim().max(200).optional(),
  estimatedMinutes: z.number().int().min(5).max(480).optional(),
});
export type CustomTopicInput = z.infer<typeof customTopicInputSchema>;

/** For "paste your syllabus as a list" — one topic per non-blank line, all
 *  sharing the same optional module label. */
export const bulkCustomTopicsSchema = z.object({
  moduleName: z.string().trim().max(100).optional(),
  names: z.array(z.string().trim().min(1).max(200)).min(1).max(200),
});
export type BulkCustomTopics = z.infer<typeof bulkCustomTopicsSchema>;

export const updateCustomTopicSchema = customTopicInputSchema.partial();
export type UpdateCustomTopic = z.infer<typeof updateCustomTopicSchema>;

export interface CustomTopicView {
  id: string;
  name: string;
  moduleName: string | null;
  noteText: string | null;
  resourceUrl: string | null;
  resourceLabel: string | null;
  estimatedMinutes: number;
  sequence: number;
  /** Whether this topic currently has a PENDING/DONE PlanItem on the active
   *  plan (or was already completed on a past one) — false means it didn't
   *  fit within the current scheduling horizon and is "unscheduled". */
  scheduled: boolean;
  createdAt: string;
}

/** Free-tier status for the independent-study-plan feature — the plan itself
 *  (goal, schedule, topics already added) is always visible regardless;
 *  this only tells the client whether creating a 4th+ topic, or acting on
 *  one (mark done/skipped, reschedule), will be rejected with
 *  SUBSCRIPTION_REQUIRED, so the UI can show that state upfront rather than
 *  waiting for the error. */
export interface StudyPlanAccessStatus {
  hasActiveSubscription: boolean;
  freeTopicLimit: number;
  customTopicCount: number;
}

export const progressUpdateSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'COMPLETED']).optional(),
  videoPositionSeconds: z.number().int().min(0).optional(),
  percentComplete: z.number().int().min(0).max(100).optional(),
});
export type ProgressUpdate = z.infer<typeof progressUpdateSchema>;

export interface DashboardResponse {
  greetingName: string | null;
  targetExam: { id: string; nameHi: string; nameEn: string } | null;
  examCountdownDays: number | null;
  /** ISO target-exam date (for a live countdown), when the student has set one. */
  examDate: string | null;
  studyStreakDays: number;
  /** Activity flags for the last 7 days, oldest first (index 6 = today). */
  streakWeek: boolean[];
  /** Total watched time across all lessons, in minutes. */
  studyTimeMinutes: number;
  /** Mean score across submitted/evaluated attempts, or null when none. */
  avgTestScorePercent: number | null;
  testsAttempted: number;
  /** Weekly study goal derived from the daily target vs. minutes done this week. */
  weeklyGoal: { targetMinutes: number; doneMinutes: number };
  stats: { coursePercent: number; lessonsCompleted: number; lessonsTotal: number };
  todayPlan: { lessonId: string; titleHi: string; titleEn: string; kind: string; freePreview: boolean }[];
  continueWatching: { lessonId: string; titleHi: string; titleEn: string; percentComplete: number }[];
  currentAffairs: { id: string; titleHi: string; titleEn: string; dateFor: string }[];
  onboarded: boolean;
  /** Whether the student currently holds any ACTIVE entitlement (course or
   *  subscription plan) — the source of truth for whether to prompt "Buy a
   *  plan" vs "View my plan". Needed alongside activeEntitlementEndsAt because
   *  a lifetime entitlement (no expiry) is indistinguishable from "no plan at
   *  all" if you only look at the date. */
  hasActivePlan: boolean;
  /** Latest expiry among active entitlements that have one, or null when the
   *  student has none active OR their only active entitlement(s) are lifetime
   *  (no expiry) — check hasActivePlan to tell those two apart. */
  activeEntitlementEndsAt: string | null;
}

export interface StudentCourseSummary {
  courseId: string;
  code: string;
  titleHi: string;
  titleEn: string;
  lessonsTotal: number;
  lessonsCompleted: number;
  percentComplete: number;
  validUntil: string | null;
}

/** A course owned by the student's own institute (regardless of public
 *  visibility) that they can browse/buy, whether or not they already have it. */
export interface InstituteCourseSummary {
  courseId: string;
  code: string;
  titleHi: string;
  titleEn: string;
  visibility: string;
  entitled: boolean;
}

export interface StudentCourseLesson {
  lessonId: string;
  titleHi: string;
  titleEn: string;
  lessonType: string;
  freePreview: boolean;
  estimatedMinutes: number | null;
  status: 'NONE' | 'IN_PROGRESS' | 'COMPLETED';
  accessible: boolean;
}
export interface StudentCourseModule {
  subjectId: string;
  nameHi: string;
  nameEn: string;
  lessons: StudentCourseLesson[];
}
export interface StudentCourseDetail {
  courseId: string;
  titleHi: string;
  titleEn: string;
  descHi: string | null;
  descEn: string | null;
  lessonsTotal: number;
  lessonsCompleted: number;
  percentComplete: number;
  validUntil: string | null;
  modules: StudentCourseModule[];
}

export const playbackTokenResponseSchema = z.object({
  url: z.string().url(),
  expiresInSeconds: z.number().int(),
  kind: z.enum(['VIDEO', 'DOCUMENT', 'EMBED']),
  watermark: z.string().nullable(),
});
export type PlaybackTokenResponse = z.infer<typeof playbackTokenResponseSchema>;
