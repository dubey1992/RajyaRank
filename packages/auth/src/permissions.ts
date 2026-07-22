import type { RoleKey } from './roles';

/**
 * Full permission-code catalogue (PRD §7 / §19). Codes are stable strings used
 * by @RequirePermission decorators, the seed, and Principal construction.
 * The policy engine itself does NOT import this catalogue — it receives the
 * principal's permission codes and the required code as data.
 */
export const PERMISSION_CODES = [
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
] as const;

export type PermissionCode = (typeof PERMISSION_CODES)[number];

export const PERMISSION_CATEGORY: Record<PermissionCode, string> = {
  'content.create': 'content',
  'content.edit_own': 'content',
  'content.edit_all': 'content',
  'content.submit_review': 'content',
  'content.review': 'content',
  'content.approve': 'content',
  'content.publish': 'content',
  'content.unpublish': 'content',
  'content.archive': 'content',
  'question.create': 'question',
  'question.import': 'question',
  'test.create': 'test',
  'course.manage': 'course',
  'assignment.manage': 'user',
  'user.invite': 'user',
  'user.disable': 'user',
  'user.manage': 'user',
  'role.manage': 'user',
  'payment.status_view': 'payment',
  'payment.manage': 'payment',
  'support.manage': 'support',
  'doubt.respond': 'support',
  'audit.view': 'audit',
  'org.manage': 'org',
  'marketing.manage': 'marketing',
};

/**
 * High-risk permissions: a denial is always audited, and (per policy) may
 * require step-up assurance (AAL2/MFA) even for Super Admin.
 */
export const HIGH_RISK_PERMISSIONS: ReadonlySet<PermissionCode> = new Set<PermissionCode>([
  'content.publish',
  'content.unpublish',
  'content.archive',
  'assignment.manage',
  'user.invite',
  'user.disable',
  'user.manage',
  'role.manage',
  'payment.manage',
  'org.manage',
]);

/**
 * Role → capability mapping (PRD §7). This is the SEED source of truth for
 * role_permissions. Students hold no staff permissions (their content access
 * is governed by entitlements, added in Phase 6).
 */
export const ROLE_PERMISSIONS: Record<RoleKey, PermissionCode[]> = {
  STUDENT: [],
  TEACHER: [
    'content.create',
    'content.edit_own',
    'content.submit_review',
    'question.create',
    'test.create',
    'doubt.respond',
  ],
  QUESTION_SETTER: ['question.create', 'question.import', 'content.edit_own', 'test.create'],
  // Reviews AND publishes — same terminal authority as Academic Head over the
  // review pipeline, just without the institution-management powers (staff/
  // students/courses). A single Head-or-Reviewer approval is sufficient to
  // move content/questions/mock tests to APPROVED; publishing them is a
  // separate step gated by content.publish, held by both roles below.
  ACADEMIC_REVIEWER: ['content.review', 'content.approve', 'content.publish', 'content.unpublish', 'content.archive', 'doubt.respond'],
  // Creates and submits content/courses/questions/mock tests without limit,
  // but deliberately CANNOT review, approve, or publish anything — that's a
  // maker/checker split: Content Admin is the maker, Academic Head/Reviewer
  // are the checkers. Only after one of them approves can it be published,
  // and Content Admin is never the one who publishes it.
  CONTENT_ADMIN: [
    'content.create',
    'content.edit_own',
    'content.edit_all',
    'content.submit_review',
    'course.manage',
    'question.create',
    'question.import',
    'test.create',
    'assignment.manage',
    'user.invite',
    'doubt.respond',
  ],
  SUPPORT_AGENT: ['support.manage', 'payment.status_view', 'doubt.respond'],
  // Per-institution admin: manages their org's staff, courses, and content
  // (org-scoped by orgId). Cannot register organizations (org.manage) or edit
  // the global role catalogue (role.manage).
  ACADEMIC_HEAD: [
    'content.create',
    'content.edit_own',
    'content.edit_all',
    'content.submit_review',
    'content.review',
    'content.approve',
    'content.publish',
    'content.unpublish',
    'content.archive',
    'course.manage',
    'question.create',
    'question.import',
    'test.create',
    'assignment.manage',
    'user.invite',
    'user.manage',
    'user.disable',
    'support.manage',
    'doubt.respond',
  ],
  // Super Admin is deliberately restricted to platform oversight only —
  // exactly the seven sections its nav shows (Dashboard/Manage Institutions/
  // Roles & Permissions/Manage Payments/Support/Recent Activities/Marketing
  // Content). The policy engine no longer grants Super Admin a blanket
  // capability bypass (see policy.engine.ts), so this list is the real,
  // enforced ceiling — course/content/question/test/staff/student management
  // are intentionally absent; an Academic Head or Content Admin must do those.
  // Marketing content (homepage testimonials/FAQ/study-content teaser) is the
  // one exception kept with Super Admin rather than Content Admin/Academic
  // Head: it's platform-wide marketing copy, not scoped to any institution.
  SUPER_ADMIN: ['org.manage', 'role.manage', 'payment.manage', 'support.manage', 'audit.view', 'marketing.manage'],
};

export function isHighRisk(code: string): boolean {
  return HIGH_RISK_PERMISSIONS.has(code as PermissionCode);
}
