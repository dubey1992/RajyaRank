import { z } from 'zod';
import { emailSchema, passwordSchema, phoneSchema } from './common';

export const roleKeySchema = z.enum([
  'TEACHER',
  'QUESTION_SETTER',
  'ACADEMIC_REVIEWER',
  'CONTENT_ADMIN',
  'SUPPORT_AGENT',
  'ACADEMIC_HEAD',
  'SUPER_ADMIN',
]);

export const assignmentInputSchema = z.object({
  scope: z.enum(['ORG', 'STATE', 'EXAM', 'COURSE', 'SUBJECT', 'BATCH']),
  stateId: z.string().uuid().optional(),
  examId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  batchId: z.string().uuid().optional(),
});
export type AssignmentInput = z.infer<typeof assignmentInputSchema>;

export const createInvitationSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: emailSchema,
  // Mandatory contact number — every invited staff member (incl. Academic
  // Heads created via org register/invite-head, which funnel through here).
  phone: phoneSchema,
  roleKey: roleKeySchema,
  assignments: z.array(assignmentInputSchema).default([]),
  expiresInHours: z.number().int().positive().max(24 * 14).optional(),
  /** Target institution. Super Admin may set it; an Institution Head's invites
   *  are always forced to their own org server-side. */
  orgId: z.string().uuid().optional(),
});

export const registerOrganizationSchema = z.object({
  name: z.string().min(2).max(160),
  code: z.string().min(2).max(40).regex(/^[A-Z0-9_]+$/, 'Uppercase letters, digits, underscores'),
  headFullName: z.string().min(2).max(120),
  headEmail: emailSchema,
  headPhone: phoneSchema,
});
export type RegisterOrganization = z.infer<typeof registerOrganizationSchema>;

export const inviteHeadSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: emailSchema,
  phone: phoneSchema,
});
export type InviteHead = z.infer<typeof inviteHeadSchema>;

export const orgStatusSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) });
export type OrgStatusUpdate = z.infer<typeof orgStatusSchema>;

export interface OrganizationHeadView {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
}

export interface OrganizationView {
  id: string;
  name: string;
  code: string;
  accessCode: string | null;
  status: string;
  headName: string | null;
  headEmail: string | null;
  headPhone: string | null;
  heads: OrganizationHeadView[];
  memberCount: number;
  createdAt: string;
}
export type CreateInvitation = z.infer<typeof createInvitationSchema>;

export const invitationPreviewSchema = z.object({
  fullName: z.string(),
  email: z.string(),
  roleKey: roleKeySchema,
  expiresAt: z.string(),
});
export type InvitationPreview = z.infer<typeof invitationPreviewSchema>;

export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});
export type AcceptInvitation = z.infer<typeof acceptInvitationSchema>;
