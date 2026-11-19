import { z } from 'zod';
import { questionTypeSchema, type QuestionType } from './test';

// Student-authored practice quiz. Deliberately a single free-text field per
// question/option (no hi/en split) — this is the student's own words, not
// published content, same precedent as CustomTopic.name in student.ts.

export const personalQuizOptionSchema = z.object({
  key: z.string().min(1).max(8),
  text: z.string().min(1).max(500),
});
export type PersonalQuizOption = z.infer<typeof personalQuizOptionSchema>;

export const personalQuizInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  customTopicId: z.string().uuid().optional(),
});
export type PersonalQuizInput = z.infer<typeof personalQuizInputSchema>;

/** correctAnswer shape mirrors question-bank/answer-shape.ts's
 *  isResponseCorrect() exactly, since that's the function that scores it:
 *  string[] of option keys for choice types, {value,tolerance} for NUMERIC,
 *  {left,right}[] for MATCH. Left as z.unknown() here (same as the staff
 *  createQuestionSchema does) — validateAnswerShape() does the real check
 *  server-side once `type` is known. */
export const personalQuizQuestionInputSchema = z
  .object({
    type: questionTypeSchema,
    text: z.string().trim().min(1).max(1000),
    options: z.array(personalQuizOptionSchema).default([]),
    correctAnswer: z.unknown(),
    explanation: z.string().trim().max(2000).optional(),
  })
  .refine((q) => q.type === 'NUMERIC' || q.options.length > 0, { message: 'Add at least one option.', path: ['options'] });
export type PersonalQuizQuestionInput = z.infer<typeof personalQuizQuestionInputSchema>;

/** Deterministic bulk import — no AI involved. The student pastes or
 *  uploads (as a plain .txt file, read client-side) a block of questions in
 *  a fixed template:
 *    Q: question text
 *    A) option
 *    B) option
 *    Answer: A          (comma-separated keys for multiple-choice)
 *    Explanation: ...   (optional)
 *    ---
 *    Q: next question...
 *  Parsing AND validation both happen server-side (never trust a
 *  client-parsed shape) — same precedent as the staff CSV question importer
 *  (test.ts's importQuestionsSchema/importResultSchema), reused here. */
export const bulkImportQuestionsTextSchema = z.object({ text: z.string().trim().min(1).max(20000) });
export type BulkImportQuestionsText = z.infer<typeof bulkImportQuestionsTextSchema>;

export const bulkImportResultSchema = z.object({
  imported: z.number().int(),
  errors: z.array(z.object({ block: z.number().int(), message: z.string() })),
});
export type BulkImportResult = z.infer<typeof bulkImportResultSchema>;

export const submitPersonalQuizAttemptSchema = z.object({
  /** { [questionId]: response } — response shape per question type, same as
   *  the real test runner sends (string[] / number / pairs). */
  answers: z.record(z.string(), z.unknown()),
});
export type SubmitPersonalQuizAttempt = z.infer<typeof submitPersonalQuizAttemptSchema>;

export interface PersonalQuizQuestionView {
  id: string;
  type: QuestionType;
  text: string;
  options: PersonalQuizOption[];
  // correctAnswer / explanation are deliberately omitted from the take-quiz
  // view (student.controller's listQuestions-for-taking variant) so a
  // student can't just read the answer off the network tab mid-attempt —
  // included only in the owner's own quiz-editor view.
  sequence: number;
  generatedByAi: boolean;
}

export interface PersonalQuizQuestionEditView extends PersonalQuizQuestionView {
  correctAnswer: unknown;
  explanation: string | null;
}

export interface PersonalQuizView {
  id: string;
  title: string;
  customTopicId: string | null;
  questionCount: number;
  bestScore: number | null;
  createdAt: string;
}

export interface PersonalQuizDetail extends PersonalQuizView {
  questions: PersonalQuizQuestionEditView[];
}

export interface PersonalQuizAttemptResult {
  id: string;
  quizId: string;
  score: number;
  maxScore: number;
  submittedAt: string;
  /** Per-question breakdown for review — correctness + the explanation, so
   *  a student sees exactly what they missed right after submitting. */
  breakdown: { questionId: string; correct: boolean; explanation: string | null }[];
  /** Revision linking: set to the scheduled date (YYYY-MM-DD) when a wrong
   *  answer auto-added a revision slot for this quiz's linked topic to the
   *  study plan — null if the quiz isn't linked to a topic, everything was
   *  correct, or a near-term slot already existed. Surfaced so the student
   *  sees it happened, not a silent background change. */
  revisionScheduledFor: string | null;
}
