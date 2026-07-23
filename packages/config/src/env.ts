import { z } from 'zod';

/**
 * Central, zod-validated environment schema. The API validates process.env at
 * boot and fails fast on misconfiguration. Frontends read only NEXT_PUBLIC_*.
 */
export const apiEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  // Deployment tier — distinct from NODE_ENV (staging/preprod run with NODE_ENV=production).
  APP_ENV: z.enum(['local', 'staging', 'preproduction', 'production']).default('local'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
  WEB_PUBLIC_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.coerce.number().int().positive().default(600),
  REFRESH_TOKEN_TTL: z.coerce.number().int().positive().default(2_592_000),
  // How long a staff "trust this device" MFA-skip lasts. Independent of
  // REFRESH_TOKEN_TTL — a device can stay trusted for MFA well past when its
  // refresh session naturally expires.
  TRUSTED_DEVICE_TTL: z.coerce.number().int().positive().default(60 * 24 * 60 * 60),
  // Empty means "host-only" (no shared-subdomain cookie scoping) — the safe
  // default for a schema meant to serve every environment. Local dev sets
  // this explicitly to 'localhost' in .env.
  COOKIE_DOMAIN: z.string().optional().default(''),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  // 'none' only when the frontend and API don't share a parent domain (see
  // cookies.ts for the full explanation). Defaults to 'lax' — the more
  // secure choice — everywhere except where explicitly overridden.
  COOKIE_SAME_SITE: z.enum(['lax', 'none']).default('lax'),

  FIELD_ENCRYPTION_KEY: z.string().min(32),

  SMS_PROVIDER: z.enum(['log', 'msg91', 'twilio']).default('log'),
  SMS_API_KEY: z.string().optional().default(''),
  OTP_TTL: z.coerce.number().int().positive().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('RajyaRank <no-reply@rajyarank.dev>'),
  // Internal inbox that "Contact Us" submissions are emailed to. Optional —
  // if unset, submissions are still persisted (visible in the staff admin
  // queue) but no notification email is sent.
  CONTACT_NOTIFY_EMAIL: z.string().optional().default(''),

  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_CALLBACK_URL: z.string().optional().default(''),

  // S3_ENDPOINT/S3_ACCESS_KEY/S3_SECRET_KEY are only set for local dev (MinIO),
  // which has no concept of IAM roles. Left unset in staging/production — real
  // AWS S3 access there comes from the ECS task's IAM role instead (see
  // S3Service), never a long-lived access key.
  S3_ENDPOINT: z.string().optional().default(''),
  S3_REGION: z.string().default('ap-south-1'),
  S3_ACCESS_KEY: z.string().optional().default(''),
  S3_SECRET_KEY: z.string().optional().default(''),
  S3_BUCKET_PRIVATE: z.string().default('rajyarank-private'),

  INVITATION_TTL_HOURS: z.coerce.number().int().positive().default(48),
  ADMIN_PUBLIC_URL: z.string().url().default('http://localhost:3001'),

  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),

  LOGIN_MAX_FAILURES: z.coerce.number().int().positive().default(5),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),
  MAX_CONCURRENT_SESSIONS: z.coerce.number().int().positive().default(5),

  // TESTING ONLY: skip the staff MFA step and issue an AAL2 session directly.
  // Only honored when APP_ENV=local — never staging/preproduction/production.
  AUTH_DEV_SKIP_MFA: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  SENTRY_DSN: z.string().optional().default(''),

  // Web Push (VAPID). Empty → push disabled; the endpoints degrade gracefully.
  VAPID_PUBLIC_KEY: z.string().optional().default(''),
  VAPID_PRIVATE_KEY: z.string().optional().default(''),
  VAPID_SUBJECT: z.string().optional().default('mailto:no-reply@rajyarank.in'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
}).refine((env) => !(env.COOKIE_SAME_SITE === 'none' && !env.COOKIE_SECURE), {
  message: 'COOKIE_SAME_SITE=none requires COOKIE_SECURE=true — browsers silently reject SameSite=None cookies that are not Secure.',
  path: ['COOKIE_SECURE'],
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function loadApiEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const parsed = apiEnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
