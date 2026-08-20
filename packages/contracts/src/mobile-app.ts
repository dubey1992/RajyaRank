import { z } from 'zod';

export const mobileAppPlatformSchema = z.enum(['ANDROID', 'IOS']);
export type MobileAppPlatform = z.infer<typeof mobileAppPlatformSchema>;

export const mobileAppReleaseStatusSchema = z.enum(['UPLOADING', 'READY', 'PUBLISHED', 'ARCHIVED']);
export type MobileAppReleaseStatus = z.infer<typeof mobileAppReleaseStatusSchema>;

/** Mirrors ASSET_LIMITS in asset.ts — one entry since only Android ships today. */
export const MOBILE_APP_RELEASE_LIMITS = {
  ANDROID: { maxBytes: 300 * 1024 * 1024, mime: ['application/vnd.android.package-archive', 'application/octet-stream'] },
  IOS: { maxBytes: 500 * 1024 * 1024, mime: ['application/octet-stream'] },
} as const;

export const createMobileReleaseIntentSchema = z.object({
  platform: mobileAppPlatformSchema.default('ANDROID'),
  versionName: z
    .string()
    .min(1)
    .max(30)
    .regex(/^\d+\.\d+\.\d+$/, 'Use semantic version format, e.g. 1.4.0'),
  versionCode: z.number().int().positive(),
  releaseNotesHi: z.string().max(2000).optional(),
  releaseNotesEn: z.string().max(2000).optional(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});
export type CreateMobileReleaseIntent = z.infer<typeof createMobileReleaseIntentSchema>;

export interface MobileReleaseUploadIntentResponse {
  releaseId: string;
  uploadUrl: string;
  expiresInSeconds: number;
}

export interface MobileAppReleaseView {
  id: string;
  platform: MobileAppPlatform;
  versionName: string;
  versionCode: number;
  releaseNotesHi: string | null;
  releaseNotesEn: string | null;
  sizeBytes: number;
  status: MobileAppReleaseStatus;
  publishedAt: string | null;
  createdAt: string;
}

/** Public shape served to the marketing page — a short-lived presigned
 *  download URL, generated fresh on every request (never a permanent public
 *  S3 URL, matching how every other protected asset in this codebase is
 *  served — see S3Service's doc comment). */
export interface MobileAppLatestReleaseView {
  versionName: string;
  releaseNotesHi: string | null;
  releaseNotesEn: string | null;
  sizeBytes: number;
  publishedAt: string;
  downloadUrl: string;
}
