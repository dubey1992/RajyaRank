import { z } from 'zod';
import { localeSchema } from './common';

export const qualificationSchema = z.enum(['10TH', '12TH', 'GRADUATE', 'POSTGRADUATE', 'TECHNICAL']);

export const onboardingSchema = z.object({
  stateId: z.string().uuid(),
  targetExamId: z.string().uuid(),
  qualification: qualificationSchema,
  locale: localeSchema.optional(),
  dailyStudyMinutes: z.number().int().min(15).max(720),
  targetDate: z.string().datetime().optional(),
  preferredSubjects: z.array(z.string()).default([]),
});
export type Onboarding = z.infer<typeof onboardingSchema>;

/** Onboarding captures these once; this lets a student revisit them any time
 *  afterwards (previously nowhere in the product could they be changed) — or,
 *  if onboarding was skipped, fill them in for the first time here instead. */
export const updateGoalsSchema = z
  .object({
    stateId: z.string().uuid().optional(),
    targetExamId: z.string().uuid().optional(),
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
  kind: 'LESSON' | 'WEAK_TOPIC_DRILL' | 'TEST';
  status: 'PENDING' | 'DONE' | 'SKIPPED' | 'MISSED' | 'RESCHEDULED';
  titleHi: string;
  titleEn: string;
  lessonId: string | null;
  topicId: string | null;
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
  qualification: string | null;
  dailyStudyMinutes: number | null;
  targetDate: string | null;
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
  /** Soonest-relevant active entitlement expiry, or null when the student has none. */
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
