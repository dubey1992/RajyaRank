import type {
  AssignmentScopeRow,
  DenyCode,
  PolicyDecision,
  PolicyInput,
  ResourceContext,
  ScopeRef,
} from './policy.types';

/**
 * ─────────────────────────────────────────────────────────────────────────
 * RajyaRank central authorization policy engine.
 *
 * A single, pure, deterministic, FAIL-CLOSED decision function. Every
 * protected action in the platform is authorized here — controllers never
 * compare role names. Authorization combines: account status + Super Admin
 * override + permission-code capability + session assurance + ownership +
 * content status + assignment scope.
 *
 * This module has NO runtime imports (types are erased) so it is trivially
 * unit-testable and portable.
 * ─────────────────────────────────────────────────────────────────────────
 */

const SCOPE_FIELDS = ['orgId', 'stateId', 'examId', 'courseId', 'subjectId', 'batchId'] as const;

/**
 * A resource scope is "covered" by an assignment when every dimension the
 * ASSIGNMENT pins matches the resource. A broader assignment (fewer pinned
 * dimensions) therefore covers narrower resources — a STATE assignment
 * (only stateId set) covers any resource in that state; a SUBJECT assignment
 * must match state+exam+course+subject where those are present on the resource.
 *
 * orgId is special-cased: it pins an actor to THEIR institution's own content,
 * but platform-wide content (resource.orgId absent — created by Content Admin,
 * not tied to any institution) was never meant to be gated behind it. Without
 * this carve-out, an Academic Head's ORG-pinned assignment made every
 * platform-wide test/question/course invisible and unactionable to them —
 * the orgId dimension would mismatch (pinned org vs. undefined) even though
 * the resource isn't scoped to ANY institution for the pin to conflict with.
 */
export function assignmentCovers(assignment: AssignmentScopeRow, resource: ScopeRef): boolean {
  for (const field of SCOPE_FIELDS) {
    const pinned = assignment[field];
    if (pinned === undefined || pinned === null) continue; // dimension not restricted
    if (field === 'orgId' && resource.orgId == null) continue; // platform-wide resource — no org to conflict with
    if (resource[field] !== pinned) return false;
  }
  return true;
}

export function scopeCovered(assignments: AssignmentScopeRow[], resource: ScopeRef): boolean {
  return assignments.some((a) => assignmentCovers(a, resource));
}

/**
 * Content-status → allowed permissions. Phase 1 stub (no content entity yet),
 * intentionally data-driven so Phase 3 fills real transitions without touching
 * the engine. If a permission is absent from the map, status does not gate it.
 */
export const STATUS_ALLOWS: Record<string, ReadonlySet<string>> = {
  'content.edit_own': new Set(['DRAFT', 'CORRECTION_REQUIRED']),
  'content.edit_all': new Set(['DRAFT', 'CORRECTION_REQUIRED', 'SUBMITTED', 'UNDER_REVIEW']),
  'content.submit_review': new Set(['DRAFT', 'CORRECTION_REQUIRED']),
  'content.review': new Set(['SUBMITTED', 'UNDER_REVIEW']),
  'content.approve': new Set(['UNDER_REVIEW']),
  'content.publish': new Set(['APPROVED', 'READY_TO_PUBLISH', 'SCHEDULED']),
  'content.unpublish': new Set(['PUBLISHED']),
  'content.archive': new Set(['DRAFT', 'REJECTED', 'UNPUBLISHED', 'APPROVED', 'PUBLISHED']),
};

export function statusAllows(permission: string, status: string): boolean {
  const allowed = STATUS_ALLOWS[permission];
  if (!allowed) return true; // permission is not status-gated
  return allowed.has(status);
}

function deny(code: DenyCode, reason: string): PolicyDecision {
  return { allow: false, code, reason };
}

/**
 * Evaluate an authorization request. Deterministic order, fail-closed.
 */
export function evaluate(input: PolicyInput): PolicyDecision {
  const { principal: p, permission, resource, requireAssurance } = input;

  // 1. Account must be active — suspended/disabled/invited can do nothing.
  if (p.status !== 'ACTIVE') {
    return deny('ACCOUNT_INACTIVE', `Account status is ${p.status}.`);
  }

  // 2. Capability — some active role must grant the permission code. Super
  //    Admin is deliberately NOT exempt here: their role is scoped to
  //    platform oversight only (org.manage, role.manage, payment.manage,
  //    support.manage, audit.view — see ROLE_PERMISSIONS.SUPER_ADMIN), so
  //    every other action is denied for them too, same as any other role.
  //    This is what makes "limited side menus" a real restriction rather
  //    than a cosmetic one — the backend enforces it, not just the nav.
  if (!p.permissionCodes.has(permission)) {
    return deny('MISSING_PERMISSION', `Missing permission: ${permission}.`);
  }

  // 3. Session assurance for high-risk actions.
  if (requireAssurance === 'AAL2' && p.assurance !== 'AAL2') {
    return deny('ASSURANCE_REQUIRED', 'Step-up authentication (MFA) required.');
  }

  // 4. Ownership for *_own permissions.
  if (permission.endsWith('_own') && resource?.ownerUserId && resource.ownerUserId !== p.userId) {
    return deny('NOT_OWNER', 'You may only act on your own content.');
  }

  // 5. Content-status gate (data-driven; Phase 3 fills real statuses).
  if (resource?.status && !statusAllows(permission, resource.status)) {
    return deny(
      'STATUS_FORBIDDEN',
      `Action not allowed while content is in status ${resource.status}.`,
    );
  }

  // 6. Assignment-scope match — only when the resource declares a scope.
  //    Global endpoints (no resource scope) rely purely on the permission code.
  //    Super Admin holds no assignments (they aren't org-scoped) but is exempt
  //    from this specific check — only for capabilities they actually hold
  //    (already confirmed above) — so e.g. Manage Institutions/Payments/
  //    Support see across every institution rather than being scope-blocked.
  if (!p.isSuperAdmin && resource?.scope && hasAnyScope(resource.scope) && !scopeCovered(p.assignments, resource.scope)) {
    return deny('OUT_OF_SCOPE', 'Resource is outside your assigned scope.');
  }

  return { allow: true };
}

function hasAnyScope(scope: ResourceContext['scope']): boolean {
  if (!scope) return false;
  return SCOPE_FIELDS.some((f) => scope[f] !== undefined && scope[f] !== null);
}
