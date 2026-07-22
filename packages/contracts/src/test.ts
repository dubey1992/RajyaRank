import { z } from 'zod';

export const questionTypeSchema = z.enum([
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'NUMERIC',
  'MATCH',
  'PASSAGE',
  'ASSERTION_REASON',
]);
export type QuestionType = z.infer<typeof questionTypeSchema>;

export const optionSchema = z.object({
  key: z.string().min(1).max(8),
  hi: z.string().optional(),
  en: z.string().optional(),
});

export const createQuestionSchema = z
  .object({
    type: questionTypeSchema,
    subjectId: z.string().min(1),
    chapterId: z.string().min(1).optional(),
    topicId: z.string().min(1).optional(),
    examId: z.string().min(1).optional(),
    textHi: z.string().optional(),
    textEn: z.string().optional(),
    options: z.array(optionSchema).default([]),
    /** keys[] for choice types; {value,tolerance} for numeric; pairs for match. */
    correctAnswer: z.unknown(),
    explanationHi: z.string().optional(),
    explanationEn: z.string().optional(),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
    marks: z.number().positive().default(1),
    negativeMarks: z.number().min(0).default(0),
    sourceType: z.enum(['ORIGINAL', 'PYQ', 'LICENSED']).optional(),
    examYear: z.number().int().optional(),
  })
  .refine((q) => q.textHi || q.textEn, { message: 'Provide Hindi or English question text' });
export type CreateQuestion = z.infer<typeof createQuestionSchema>;

/** Bulk import: client parses the CSV/XLSX template into rows; server validates each. */
export const importQuestionsSchema = z.object({ rows: z.array(createQuestionSchema) });
export const importResultSchema = z.object({
  imported: z.number().int(),
  errors: z.array(z.object({ row: z.number().int(), message: z.string() })),
});
export type ImportResult = z.infer<typeof importResultSchema>;

// ── Test builder ────────────────────────────────────────────────────────────
export const createTestSchema = z.object({
  examId: z.string().uuid(),
  courseId: z.string().uuid().optional(),
  type: z.enum(['DAILY_QUIZ', 'CHAPTER', 'TOPIC', 'SUBJECT', 'SECTIONAL', 'PREVIOUS_YEAR', 'FULL_MOCK', 'CUSTOM']),
  titleHi: z.string().min(1),
  titleEn: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  negativeMarking: z.boolean().default(true),
  randomizeQuestions: z.boolean().default(false),
  randomizeOptions: z.boolean().default(false),
  resultRelease: z.enum(['IMMEDIATE', 'AFTER_WINDOW', 'MANUAL']).default('IMMEDIATE'),
  attemptLimit: z.number().int().positive().optional(),
  /** Minimum % of maxScore to "pass" the test (0–100). Optional. */
  passingScore: z.number().int().min(0).max(100).optional(),
});
export type CreateTest = z.infer<typeof createTestSchema>;

export const addSectionSchema = z.object({ nameHi: z.string().min(1), nameEn: z.string().min(1), sequence: z.number().int().default(0) });
export const addTestQuestionSchema = z.object({
  questionVersionId: z.string().uuid(),
  sequence: z.number().int().default(0),
  marks: z.number().positive().optional(),
  negativeMarks: z.number().min(0).optional(),
});

/** One-shot mock-test creation for the content wizard's basic step: creates the
 *  Test + TestVersion + a single section + all attached questions transactionally.
 *  Questions can come from two sources, combinable in one call: `questionVersionIds`
 *  (existing, already-approved bank questions) and/or `newQuestions` (bulk-uploaded
 *  rows — created and auto-approved in the same transaction, since the Mock Test's
 *  own single-approval review (by an Academic Head or Reviewer) is the quality
 *  gate for bulk-uploaded content, not a separate per-question review). */
export const quickCreateQuizSchema = z
  .object({
    examId: z.string().uuid(),
    courseId: z.string().uuid().optional(),
    type: z.enum(['DAILY_QUIZ', 'CHAPTER', 'TOPIC', 'SUBJECT', 'SECTIONAL', 'PREVIOUS_YEAR', 'FULL_MOCK', 'CUSTOM']).default('CUSTOM'),
    titleHi: z.string().min(1),
    titleEn: z.string().min(1),
    durationMinutes: z.number().int().positive(),
    negativeMarking: z.boolean().default(true),
    attemptLimit: z.number().int().positive().optional(),
    resultRelease: z.enum(['IMMEDIATE', 'AFTER_WINDOW', 'MANUAL']).default('IMMEDIATE'),
    passingScore: z.number().int().min(0).max(100).optional(),
    questionVersionIds: z.array(z.string().uuid()).default([]),
    newQuestions: z.array(createQuestionSchema).default([]),
    submitForReview: z.boolean().default(true),
  })
  .refine((d) => d.questionVersionIds.length + d.newQuestions.length >= 1, {
    message: 'Add at least one question (pick existing or bulk-upload new).',
    path: ['questionVersionIds'],
  });
export type QuickCreateQuiz = z.infer<typeof quickCreateQuizSchema>;
export interface QuickCreateQuizResponse {
  id: string;
  testVersionId: string;
  status: string;
  imported?: number;
}

// ── Mock Test dual approval (Academic Head + Academic Reviewer) ─────────────
export const rejectTestSchema = z.object({ reason: z.string().trim().min(5).max(500) });
export type RejectTest = z.infer<typeof rejectTestSchema>;

export interface TestListItem {
  id: string;
  titleHi: string;
  titleEn: string;
  type: string;
  currentVersion: {
    id: string;
    status: string;
    durationMinutes: number;
    headApprovedBy: string | null;
    reviewerApprovedBy: string | null;
    rejectionReason: string | null;
  } | null;
}

// ── Attempts (student) ────────────────────────────────────────────────────────
export const saveAnswerSchema = z.object({
  response: z.unknown(),
  markedForReview: z.boolean().optional(),
  sequenceNo: z.number().int().min(0),
});
export type SaveAnswer = z.infer<typeof saveAnswerSchema>;

export interface AttemptQuestion {
  questionVersionId: string;
  type: QuestionType;
  textHi: string | null;
  textEn: string | null;
  options: { key: string; hi?: string; en?: string }[];
  marks: number;
  negativeMarks: number;
}
export interface StartAttemptResponse {
  attemptId: string;
  expiresAt: string;
  durationMinutes: number;
  sections: { id: string; nameHi: string; nameEn: string; questions: AttemptQuestion[] }[];
}
export interface AttemptResult {
  status: string;
  score: number;
  maxScore: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  accuracy: number;
  released: boolean;
  passingScore: number | null;
  passed: boolean | null;
  rank: number | null;
  percentile: number | null;
  totalAttempts: number;
  subjectAnalysis: { subject: string; correct: number; total: number }[];
  /** Populated only once results are released — full per-question review data,
   *  including what the student actually selected (`response`), so a review
   *  screen can show it side-by-side with the correct answer. */
  questions?: {
    questionVersionId: string;
    type: QuestionType;
    textHi: string | null;
    textEn: string | null;
    options: { key: string; hi?: string; en?: string }[];
    response: unknown;
    isCorrect: boolean | null;
    awarded: number | null;
    correctAnswer: unknown;
    explanationHi: string | null;
    explanationEn: string | null;
  }[];
}

/** `GET /student/tests` row — `completedAttemptId` is set once the student has
 *  a SUBMITTED/AUTO_SUBMITTED/EVALUATED attempt for this test version, so the
 *  frontend can show "View results" instead of "Start test" (single-attempt
 *  policy: a completed test can never be restarted). */
export interface StudentTestListItem {
  testVersionId: string;
  titleHi: string;
  titleEn: string;
  type: string;
  durationMinutes: number;
  questionCount: number;
  completedAttemptId: string | null;
}

/** A weak area for the student — usually a curriculum Topic, but a Subject
 *  when the underlying questions were never linked to a specific topic (e.g.
 *  bulk-CSV-imported ones, which only carry a subjectId). `kind` tells the
 *  UI which it's looking at; `id` is the Topic or Subject id accordingly —
 *  never assume it's a Topic id without checking `kind` first. */
export interface WeakTopic {
  id: string;
  kind: 'topic' | 'subject';
  nameHi: string;
  nameEn: string;
  correct: number;
  total: number;
  accuracy: number;
}
