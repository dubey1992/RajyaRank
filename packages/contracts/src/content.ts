import { z } from 'zod';
import { difficultySchema, contentLanguageSchema } from './common';

export const contentStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'CORRECTION_REQUIRED',
  'APPROVED',
  'READY_TO_PUBLISH',
  'SCHEDULED',
  'PUBLISHED',
  'UNPUBLISHED',
  'ARCHIVED',
  'REJECTED',
  'SUPERSEDED',
]);
export type ContentStatus = z.infer<typeof contentStatusSchema>;

/** Edit a draft / correction-required version. rowVersion guards concurrent edits. */
export const editVersionSchema = z.object({
  titleHi: z.string().min(1).optional(),
  titleEn: z.string().min(1).optional(),
  summaryHi: z.string().optional(),
  summaryEn: z.string().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  difficulty: difficultySchema.optional(),
  language: contentLanguageSchema.optional(),
  changeSummary: z.string().max(500).optional(),
  rowVersion: z.number().int().positive(),
});
export type EditVersion = z.infer<typeof editVersionSchema>;

export const commentSchema = z.object({ body: z.string().min(1).max(2000) });

export const requestCorrectionSchema = z.object({ body: z.string().min(1).max(2000) });
export const rejectSchema = z.object({ reason: z.string().min(1).max(2000) });
export const scheduleSchema = z.object({ publishAt: z.string().datetime() });
export const unpublishSchema = z.object({ reason: z.string().min(1).max(500) });

export const attachAssetSchema = z.object({
  assetId: z.string().uuid(),
  role: z.enum(['PRIMARY_VIDEO', 'PDF_NOTES', 'ATTACHMENT', 'THUMBNAIL']),
  sequence: z.number().int().default(0),
});
export type AttachAsset = z.infer<typeof attachAssetSchema>;

export const reviewQueueItemSchema = z.object({
  versionId: z.string().uuid(),
  lessonId: z.string().uuid(),
  titleHi: z.string(),
  titleEn: z.string(),
  status: contentStatusSchema,
  courseId: z.string().uuid(),
  subjectId: z.string().uuid(),
  submittedAt: z.string().nullable(),
  createdBy: z.string(),
});
export type ReviewQueueItem = z.infer<typeof reviewQueueItemSchema>;
