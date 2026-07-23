import { z } from 'zod';
import { emailSchema, passwordSchema, phoneSchema } from './common';
import { roleKeySchema, assignmentInputSchema } from './invitations';

// ── Student enrollment (institution) ─────────────────────────────────────────
// Email + password is the primary login credential, always collected up
// front by the Academic Head — phone stays mandatory too (SMS/contact,
// account recovery) but is no longer the only guaranteed login method.
export const enrollStudentSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
});
export type EnrollStudent = z.infer<typeof enrollStudentSchema>;

export const studentListItemSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  status: z.string(),
  lastLoginAt: z.string().nullable(),
  // Only set on enroll()'s response, not list(): true when this phone number
  // already had an unaffiliated account that just got linked to this org,
  // rather than a brand-new account being created.
  reattached: z.boolean().optional(),
});
export type StudentListItem = z.infer<typeof studentListItemSchema>;

export const staffStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'DISABLED']);

export const patchStaffStatusSchema = z.object({
  status: staffStatusSchema,
  reason: z.string().max(500).optional(),
});

export const staffListItemSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  roleKeys: z.array(roleKeySchema),
  status: z.enum(['INVITED', 'PENDING_SETUP', 'ACTIVE', 'SUSPENDED', 'DISABLED']),
  lastLoginAt: z.string().nullable(),
  // True only for the institution's own accepted head (Organization.headUserId)
  // — disabling/revoking them would orphan the institution, so the admin UI
  // hides those controls for this specific row.
  isPrimaryHead: z.boolean().optional(),
});
export type StaffListItem = z.infer<typeof staffListItemSchema>;

export const setAssignmentsSchema = z.object({
  assignments: z.array(assignmentInputSchema),
});

export const assignmentViewSchema = z.object({
  id: z.string(),
  scope: z.enum(['ORG', 'STATE', 'EXAM', 'COURSE', 'SUBJECT', 'BATCH']),
  stateId: z.string().nullable(),
  examId: z.string().nullable(),
  courseId: z.string().nullable(),
  subjectId: z.string().nullable(),
  batchId: z.string().nullable(),
});
export type AssignmentView = z.infer<typeof assignmentViewSchema>;

export const staffDetailSchema = staffListItemSchema.extend({
  assignments: z.array(assignmentViewSchema),
});
export type StaffDetail = z.infer<typeof staffDetailSchema>;

// ── Permission Matrix (Super Admin only) ─────────────────────────────────────
// Mirrors packages/auth/src/permissions.ts's PERMISSION_CODES — kept as its own
// zod enum here rather than importing @rajyarank/auth, matching how roleKeySchema
// above already duplicates ROLE_KEYS instead of cross-importing.
export const permissionCodeSchema = z.enum([
  'content.create',
  'content.edit_own',
  'content.edit_all',
  'content.submit_review',
  'content.review',
  'content.approve',
  'content.publish',
  'content.unpublish',
  'content.archive',
  'question.create',
  'question.import',
  'test.create',
  'course.manage',
  'assignment.manage',
  'user.invite',
  'user.disable',
  'user.manage',
  'role.manage',
  'payment.status_view',
  'payment.manage',
  'support.manage',
  'doubt.respond',
  'audit.view',
  'org.manage',
  'marketing.manage',
]);

export const updateRolePermissionsSchema = z.object({
  permissionCodes: z.array(permissionCodeSchema),
});
export type UpdateRolePermissions = z.infer<typeof updateRolePermissionsSchema>;

export const auditEventSchema = z.object({
  id: z.string().uuid(),
  actorUserId: z.string().nullable(),
  actorRole: z.string().nullable(),
  action: z.string(),
  targetType: z.string().nullable(),
  targetId: z.string().nullable(),
  result: z.enum(['SUCCESS', 'DENIED', 'FAILED']),
  reasonCode: z.string().nullable(),
  createdAt: z.string(),
});
export type AuditEvent = z.infer<typeof auditEventSchema>;
