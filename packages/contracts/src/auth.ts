import { z } from 'zod';
import { emailSchema, localeSchema, passwordSchema, phoneSchema } from './common';

// ── Student OTP ─────────────────────────────────────────────────────────────
export const studentOtpRequestSchema = z.object({ phone: phoneSchema });
export type StudentOtpRequest = z.infer<typeof studentOtpRequestSchema>;

export const studentOtpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});
export type StudentOtpVerify = z.infer<typeof studentOtpVerifySchema>;

// ── Student email + password (signup, login, password reset) ────────────────
export const studentSignupRequestSchema = z.object({ email: emailSchema });
export type StudentSignupRequest = z.infer<typeof studentSignupRequestSchema>;

export const studentSignupVerifySchema = z.object({
  email: emailSchema,
  code: z.string().min(4).max(10),
  password: passwordSchema,
});
export type StudentSignupVerify = z.infer<typeof studentSignupVerifySchema>;

export const studentLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
  remember: z.boolean().optional(),
});
export type StudentLogin = z.infer<typeof studentLoginSchema>;

export const studentPasswordForgotSchema = z.object({ email: emailSchema });
export type StudentPasswordForgot = z.infer<typeof studentPasswordForgotSchema>;

export const studentPasswordResetSchema = z.object({
  email: emailSchema,
  code: z.string().min(4).max(10),
  password: passwordSchema,
});
export type StudentPasswordReset = z.infer<typeof studentPasswordResetSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});
export type ChangePassword = z.infer<typeof changePasswordSchema>;

// ── Staff login + MFA ────────────────────────────────────────────────────────
export const staffLoginSchema = z.object({
  workEmail: emailSchema,
  password: z.string().min(1),
  /** "Remember me" — when false, the session uses a short, not-remembered TTL. */
  remember: z.boolean().optional(),
});
export type StaffLogin = z.infer<typeof staffLoginSchema>;

export const staffMfaVerifySchema = z.object({
  mfaToken: z.string().min(1),
  totp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit authenticator code'),
  // Opt in to skipping the TOTP challenge on this device for TRUSTED_DEVICE_TTL.
  trustDevice: z.boolean().optional().default(false),
});
export type StaffMfaVerify = z.infer<typeof staffMfaVerifySchema>;

// ── Password reset (staff email + code, delivered over email) ────────────────
export const passwordForgotSchema = z.object({ workEmail: emailSchema });
export const passwordResetSchema = z.object({
  workEmail: emailSchema,
  code: z.string().min(4).max(10),
  password: passwordSchema,
});
export type PasswordForgot = z.infer<typeof passwordForgotSchema>;
export type PasswordReset = z.infer<typeof passwordResetSchema>;

// ── Session / me ─────────────────────────────────────────────────────────────
export const meResponseSchema = z.object({
  userId: z.string().uuid(),
  kind: z.enum(['STUDENT', 'STAFF']),
  displayName: z.string().nullable(),
  locale: localeSchema,
  roleKeys: z.array(z.string()),
  permissionCodes: z.array(z.string()),
  assurance: z.enum(['AAL1', 'AAL2']),
  homeRoute: z.string(),
  orgId: z.string().nullable(),
});
export type MeResponse = z.infer<typeof meResponseSchema>;

export const updateLocaleSchema = z.object({ locale: localeSchema });

// ── Profile (self-service) ───────────────────────────────────────────────────
export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  fullName: z.string().trim().min(1).max(120).optional(),
  title: z.string().trim().max(120).optional(),
});
export type UpdateProfile = z.infer<typeof updateProfileSchema>;

/** Institution's active subscription plan + its benefits — populated for
 *  STAFF (Academic Head) profiles only, never for students. */
export interface ProfileInstitutionPlan {
  code: string;
  nameHi: string;
  nameEn: string;
  status: string;
  billingCycle: string;
  currentPeriodEnd: string | null;
  maxActiveStudents: number;
  maxStaffSeats: number;
  storageGb: number;
  internalFeeBps: number;
  externalFeeBps: number;
}

export interface ProfileResponse {
  kind: 'STUDENT' | 'STAFF';
  displayName: string | null;
  email: string | null;
  phone: string | null;
  fullName: string | null;
  title: string | null;
  /** The institution the user belongs to, when enrolled/assigned to one.
   *  accessCode is the same non-secret redemption code the institute hands
   *  out to prospective students — safe to show back to an existing member. */
  institution: { id: string; name: string; accessCode: string | null; plan: ProfileInstitutionPlan | null } | null;
  /** Whether this account has a password set (email+password login/signup, or staff). */
  hasPassword: boolean;
  /** Whether TOTP MFA is enabled — STAFF only, always false for students. */
  mfaEnabled: boolean;
}

export const staffLoginResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('AUTHENTICATED'), homeRoute: z.string() }),
  z.object({ status: z.literal('MFA_REQUIRED'), mfaToken: z.string() }),
]);
export type StaffLoginResult = z.infer<typeof staffLoginResultSchema>;

export const sessionSummarySchema = z.object({
  id: z.string().uuid(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string(),
  lastUsedAt: z.string(),
  current: z.boolean(),
});
export type SessionSummary = z.infer<typeof sessionSummarySchema>;
