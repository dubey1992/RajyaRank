import { z } from 'zod';
import { difficultySchema, contentLanguageSchema } from './common';
import type { StudentCourseDetail } from './student';

const bilingual = { hi: z.string().min(1), en: z.string().min(1) };

export const createCourseSchema = z.object({
  code: z.string().min(2).max(40).regex(/^[A-Z0-9_]+$/, 'Uppercase letters, digits, underscores'),
  stateId: z.string().uuid(),
  examId: z.string().uuid(),
  titleHi: bilingual.hi,
  titleEn: bilingual.en,
  descHi: z.string().optional(),
  descEn: z.string().optional(),
});
export type CreateCourse = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = z.object({
  titleHi: z.string().min(1).optional(),
  titleEn: z.string().min(1).optional(),
  descHi: z.string().optional(),
  descEn: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']).optional(),
  sequence: z.number().int().optional(),
  coursePromiseHi: z.string().optional(),
  coursePromiseEn: z.string().optional(),
  learningOutcomes: z.array(z.string().min(1)).optional(),
  recommendedDailyStudyMinutes: z.number().int().positive().optional(),
  expectedCompletionDays: z.number().int().positive().optional(),
  masteryThresholdPercent: z.number().int().min(1).max(100).optional(),
  prerequisitesHi: z.string().optional(),
  prerequisitesEn: z.string().optional(),
});
export type UpdateCourse = z.infer<typeof updateCourseSchema>;

/** One pass/fail check in the Course Studio's Review step. Hard gates block
 *  publishing (status→ACTIVE + visibility→PUBLIC); soft gates only nudge. */
export interface CourseReadinessGate {
  key: 'curriculum' | 'publishedLesson' | 'pricing' | 'metadata' | 'freePreview' | 'learningOutcomes';
  labelHi: string;
  labelEn: string;
  passed: boolean;
  hard: boolean;
}
export interface CourseReadinessView {
  percent: number;
  hardGatesPassed: boolean;
  gates: CourseReadinessGate[];
}

/** Public course outline (Subject → Chapter → Topic → published Lessons only)
 *  — the single shared shape for the public course page, replacing three
 *  previously hand-rolled local interfaces for the same wire response. */
export interface CourseOutlineLesson {
  id: string;
  lessonType: 'VIDEO' | 'PDF' | 'TEXT' | 'QUIZ' | 'MIXED';
  freePreview: boolean;
  titleHi: string;
  titleEn: string;
  estimatedMinutes: number | null;
}
export interface CourseOutlineTopic {
  id: string;
  nameHi: string;
  nameEn: string;
  lessons: CourseOutlineLesson[];
}
export interface CourseOutlineChapter {
  id: string;
  nameHi: string;
  nameEn: string;
  topics: CourseOutlineTopic[];
}
export interface CourseOutlineSubject {
  id: string;
  nameHi: string;
  nameEn: string;
  chapters: CourseOutlineChapter[];
}
export interface CourseOutlineView {
  id: string;
  code: string;
  titleHi: string;
  titleEn: string;
  descHi: string | null;
  descEn: string | null;
  stateId: string;
  examId: string;
  orgId: string | null;
  coursePromiseHi: string | null;
  coursePromiseEn: string | null;
  learningOutcomes: string[];
  subjects: CourseOutlineSubject[];
}

/** "Open student preview" (Course Studio Review step) — bundles the same
 *  marketing-hero shape the public course page renders with a sample,
 *  never-real enrolled-curriculum view, so the Academic Head can see both
 *  even for a course that isn't published yet. */
export interface CoursePreviewResponse {
  outline: CourseOutlineView;
  curriculum: StudentCourseDetail;
}

export const createBatchSchema = z.object({
  code: z.string().min(1).max(40),
  nameHi: bilingual.hi,
  nameEn: bilingual.en,
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});
export type CreateBatch = z.infer<typeof createBatchSchema>;

export const createSubjectSchema = z.object({
  nameHi: bilingual.hi,
  nameEn: bilingual.en,
  sequence: z.number().int().default(0),
});
export const createChapterSchema = z.object({
  nameHi: bilingual.hi,
  nameEn: bilingual.en,
  sequence: z.number().int().default(0),
});
export const createTopicSchema = z.object({
  nameHi: bilingual.hi,
  nameEn: bilingual.en,
  sequence: z.number().int().default(0),
});

/** Reorder a Subject/Chapter/Topic among its siblings — the curriculum
 *  builder re-numbers the whole sibling list on every move (simplest way to
 *  stay correct regardless of prior sequence values, e.g. every row created
 *  before this existed shares sequence 0), not just the moved item's rank. */
export const updateSequenceSchema = z.object({ sequence: z.number().int().min(0) });

export const createLessonSchema = z.object({
  lessonType: z.enum(['VIDEO', 'PDF', 'TEXT', 'QUIZ', 'MIXED']),
  freePreview: z.boolean().default(false),
  sequence: z.number().int().default(0),
  batchId: z.string().uuid().optional(),
  titleHi: bilingual.hi,
  titleEn: bilingual.en,
  summaryHi: z.string().optional(),
  summaryEn: z.string().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  difficulty: difficultySchema.optional(),
  language: contentLanguageSchema.optional(),
});
export type CreateLesson = z.infer<typeof createLessonSchema>;

export const reorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});
