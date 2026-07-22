import { z } from 'zod';

/** Allowed upload types + limits (mirrored server-side; the client cannot widen them). */
export const ASSET_LIMITS = {
  VIDEO: { maxBytes: 2 * 1024 * 1024 * 1024, mime: ['video/mp4', 'video/webm'] },
  AUDIO: { maxBytes: 200 * 1024 * 1024, mime: ['audio/mpeg', 'audio/mp4'] },
  IMAGE: { maxBytes: 10 * 1024 * 1024, mime: ['image/png', 'image/jpeg', 'image/webp'] },
  DOCUMENT: { maxBytes: 100 * 1024 * 1024, mime: ['application/pdf'] },
} as const;

export const uploadIntentSchema = z.object({
  assetType: z.enum(['VIDEO', 'AUDIO', 'IMAGE', 'DOCUMENT']),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});
export type UploadIntent = z.infer<typeof uploadIntentSchema>;

export const uploadIntentResponseSchema = z.object({
  assetId: z.string().uuid(),
  uploadUrl: z.string().url(),
  storageKey: z.string(),
  expiresInSeconds: z.number().int(),
});
export type UploadIntentResponse = z.infer<typeof uploadIntentResponseSchema>;

export const completeUploadSchema = z.object({
  checksum: z.string().optional(),
});

/** Free-preview-only video source: no upload, no S3, ready immediately. */
export const createEmbedAssetSchema = z.object({
  assetType: z.literal('VIDEO'),
  embedUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith('https://'), 'Embed URL must use https.'),
});
export type CreateEmbedAsset = z.infer<typeof createEmbedAssetSchema>;
