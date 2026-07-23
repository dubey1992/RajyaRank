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
export interface PasswordRule {
  id: string;
  test: (password: string) => boolean;
  labelHi: string;
  labelEn: string;
}

/** Single source of truth for password strength — both `passwordSchema`
 *  below AND every password-setting form's live UI checklist are built
 *  from this same list, so what the UI shows a user is exactly what the
 *  backend enforces. */
export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', test: (p) => p.length >= 10, labelHi: 'कम से कम 10 अक्षर', labelEn: 'At least 10 characters' },
  { id: 'upper', test: (p) => /[A-Z]/.test(p), labelHi: 'एक बड़ा अक्षर (A-Z)', labelEn: 'One uppercase letter (A-Z)' },
  { id: 'lower', test: (p) => /[a-z]/.test(p), labelHi: 'एक छोटा अक्षर (a-z)', labelEn: 'One lowercase letter (a-z)' },
  { id: 'digit', test: (p) => /[0-9]/.test(p), labelHi: 'एक अंक (0-9)', labelEn: 'One number (0-9)' },
  { id: 'special', test: (p) => /[^A-Za-z0-9]/.test(p), labelHi: 'एक विशेष चिह्न (!@#$ आदि)', labelEn: 'One special character (!@#$ etc.)' },
];

export const passwordSchema = z
  .string()
  .min(1, 'Please enter a password')
  .max(128, 'Password must be at most 128 characters')
  .refine((p) => PASSWORD_RULES.every((r) => r.test(p)), {
    message: 'Password must be at least 10 characters and include an uppercase letter, a lowercase letter, a number and a special character.',
  });
