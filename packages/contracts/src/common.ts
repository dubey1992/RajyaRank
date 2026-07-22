import { z } from 'zod';

/** Stable, machine-readable error codes (mirrors backend spec §21). */
export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_OTP_INVALID',
  'AUTH_OTP_EXPIRED',
  'AUTH_OTP_TOO_MANY_ATTEMPTS',
  'AUTH_MFA_REQUIRED',
  'AUTH_MFA_INVALID',
  'ACCOUNT_LOCKED',
  'ACCOUNT_DISABLED',
  'INVITATION_INVALID',
  'INVITATION_EXPIRED',
  'PERMISSION_DENIED',
  'CONTENT_STATE_INVALID',
  'CONTENT_VERSION_CONFLICT',
  'ASSET_NOT_READY',
  'ENTITLEMENT_REQUIRED',
  'PAYMENT_SIGNATURE_INVALID',
  'PAYMENT_ALREADY_PROCESSED',
  'COUPON_INVALID',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** Consistent success envelope: { data, meta, requestId }. */
export interface SuccessEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
  requestId: string;
}

/** Consistent error envelope: { error, requestId }. */
export interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    fieldErrors?: { path: string; message: string }[];
  };
  requestId: string;
}

export const localeSchema = z.enum(['hi', 'en']);
export type Locale = z.infer<typeof localeSchema>;

export const difficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);
export type DifficultyValue = z.infer<typeof difficultySchema>;

export const contentLanguageSchema = z.enum(['HINDI', 'ENGLISH', 'BILINGUAL']);
export type ContentLanguageValue = z.infer<typeof contentLanguageSchema>;

export const productAudienceSchema = z.enum(['PUBLIC', 'INSTITUTE']);
export type ProductAudienceValue = z.infer<typeof productAudienceSchema>;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const phoneSchema = z
  .string()
  .min(1, 'Please enter your phone number')
  .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number');
export const emailSchema = z
  .string()
  .min(1, 'Please enter your email address')
  .email('Please enter a valid email address');
export const passwordSchema = z
  .string()
  .min(1, 'Please enter a password')
  .min(10, 'Password must be at least 10 characters')
  .max(128);
