import { z } from 'zod';

/** Student-uploaded previous-year paper. assetId is an already-uploaded
 *  MediaAsset id via the student upload-intent/complete flow (mirrors the
 *  staff flow in asset.ts exactly, same contracts reused). answerKey is
 *  optional and entirely student-typed — a paper with none just never
 *  auto-scores, which is correct, not a missing feature. */
export const createStudentPaperSchema = z.object({
  title: z.string().trim().min(1).max(200),
  assetId: z.string().uuid(),
  examId: z.string().uuid().optional(),
  year: z.number().int().min(1990).max(2100).optional(),
  /** So the timed-practice answer sheet knows how many slots to render even
   *  before/without an answer key — derived from the key's length server-side
   *  if left unset but a key is given. */
  questionCount: z.number().int().min(1).max(500).optional(),
  /** "1:A, 2:C, 3:B" — lenient free-text the student types, parsed into
   *  { [questionNumber]: key }. Parsing happens server-side (not trusted
   *  client JSON) so a malformed paste can't corrupt the stored shape. */
  answerKeyText: z.string().trim().max(5000).optional(),
});
export type CreateStudentPaper = z.infer<typeof createStudentPaperSchema>;

export const submitStudentPaperAttemptSchema = z.object({
  /** { [questionNumber]: "A" } — same key format as the parsed answer key. */
  answers: z.record(z.string(), z.string()),
});
export type SubmitStudentPaperAttempt = z.infer<typeof submitStudentPaperAttemptSchema>;

export interface StudentPaperView {
  id: string;
  title: string;
  year: number | null;
  questionCount: number | null;
  hasAnswerKey: boolean;
  assetId: string;
  bestScore: number | null; // percent, null if never submitted or no answer key
  createdAt: string;
}

export interface StudentPaperAttemptResult {
  id: string;
  paperId: string;
  /** Null when the paper has no answer key — "submitted for manual review",
   *  not "scored zero". The UI must tell these apart. */
  score: number | null;
  maxScore: number | null;
  submittedAt: string;
}
