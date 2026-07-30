import { z } from 'zod';

/** Official exam-body notice → human-reviewed → publish updates the Exam
 *  calendar + tags affected Concepts with a syllabus version + notifies
 *  students targeting that exam (Phase 4, Notification-to-Action pipeline).
 *  Deliberately a flat, single-row content type — the same right-sized
 *  ContentStatus subset Current Affairs uses (DRAFT/SUBMITTED/
 *  CORRECTION_REQUIRED/PUBLISHED/UNPUBLISHED/ARCHIVED), not the full
 *  versioned lesson state machine. No AI/extraction-confidence concept —
 *  every field here is human-entered. */
export const upsertOfficialNoticeSchema = z.object({
  examId: z.string().uuid(),
  noticeNumber: z.string().min(1).max(100),
  publishedDate: z.string().min(1), // YYYY-MM-DD, parsed server-side
  sourceUrl: z.string().url().max(500).optional(),
  sourceAssetId: z.string().uuid().optional(),
  titleHi: z.string().min(1).max(200),
  titleEn: z.string().min(1).max(200),
  bodyHi: z.string().min(1),
  bodyEn: z.string().min(1),
  proposedApplicationDeadline: z.string().optional(),
  proposedExamDate: z.string().optional(),
  affectedConceptIds: z.array(z.string().uuid()).default([]),
  syllabusVersionTag: z.string().max(60).optional(),
});
export type UpsertOfficialNotice = z.infer<typeof upsertOfficialNoticeSchema>;

export interface OfficialNoticeView {
  id: string;
  examId: string;
  examNameHi: string;
  examNameEn: string;
  noticeNumber: string;
  publishedDate: string;
  sourceUrl: string | null;
  sourceAssetId: string | null;
  titleHi: string;
  titleEn: string;
  bodyHi: string;
  bodyEn: string;
  proposedApplicationDeadline: string | null;
  proposedExamDate: string | null;
  affectedConceptIds: string[];
  syllabusVersionTag: string | null;
  status: string;
  publishedAt: string | null;
  correctionReason: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}
