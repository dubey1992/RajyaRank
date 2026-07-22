/**
 * Canonical role keys. Kept as a string-literal union (not a TS enum) so the
 * pure policy engine stays runtime-light and type-stripping friendly.
 */
export const ROLE_KEYS = [
  'STUDENT',
  'TEACHER',
  'QUESTION_SETTER',
  'ACADEMIC_REVIEWER',
  'CONTENT_ADMIN',
  'SUPPORT_AGENT',
  'ACADEMIC_HEAD',
  'SUPER_ADMIN',
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

/**
 * Roles currently active in the product. Others remain in ROLE_KEYS for data
 * integrity (existing assignments) but are not offered for new assignments or
 * shown in the roles matrix. "Limit the roles for now."
 */
export const ACTIVE_ROLE_KEYS: readonly RoleKey[] = [
  'SUPER_ADMIN',
  'ACADEMIC_HEAD',
  'CONTENT_ADMIN',
  'ACADEMIC_REVIEWER',
  'STUDENT',
] as const;

/** Staff roles that can be invited/assigned via the admin UI (excludes STUDENT + SUPER_ADMIN). */
export const STAFF_ASSIGNABLE_ROLES: readonly RoleKey[] = [
  'ACADEMIC_HEAD',
  'CONTENT_ADMIN',
  'ACADEMIC_REVIEWER',
] as const;

/** Role → the admin landing route the backend redirects to after login.
 *  Every ACTIVE staff role now lands on the shared Dashboard (which renders a
 *  role-appropriate overview section) rather than jumping straight into a
 *  work queue — the legacy/deprioritized roles below keep their old routes
 *  since they have no dashboard section built for them yet. */
export const ROLE_HOME_ROUTE: Record<RoleKey, string> = {
  STUDENT: '/dashboard',
  TEACHER: '/admin/my-content',
  QUESTION_SETTER: '/admin/question-bank',
  ACADEMIC_REVIEWER: '/admin/dashboard',
  CONTENT_ADMIN: '/admin/dashboard',
  SUPPORT_AGENT: '/admin/support',
  ACADEMIC_HEAD: '/admin/dashboard',
  SUPER_ADMIN: '/admin/dashboard',
};
