import { z } from 'zod';

/** Staff-uploaded previous-year exam paper (PDF/document) — a flat,
 *  single-row content type like OfficialNotice, going through the same
 *  DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED -> PUBLISHED pipeline
 *  Questions use (question-bank.service.ts), not the full versioned Lesson
 *  state machine. `assetId` is an already-uploaded MediaAsset id (via the
 *  existing /staff/assets/upload-intents -> S3 PUT -> /complete flow). */
export const createPyqPaperSchema = z.object({
  examId: z.string().uuid(),
  titleHi: z.string().min(1).max(200),
  titleEn: z.string().min(1).max(200),
  year: z.number().int().min(1990).max(2100),
  assetId: z.string().uuid(),
});
export type CreatePyqPaper = z.infer<typeof createPyqPaperSchema>;

export interface PyqPaperView {
  id: string;
  examId: string;
  examNameHi: string;
  examNameEn: string;
  titleHi: string;
  titleEn: string;
  year: number;
  status: string;
  createdBy: string;
  createdAt: string;
  publishedAt: string | null;
}

export interface StudentPyqPaperListItem {
  id: string;
  examNameHi: string;
  examNameEn: string;
  titleHi: string;
  titleEn: string;
  year: number;
}

export interface PyqPaperDownload {
  url: string;
  expiresInSeconds: number;
}
