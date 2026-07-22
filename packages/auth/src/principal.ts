import type { RoleKey } from './roles';
import { ROLE_PERMISSIONS } from './permissions';
import type { AccountStatus, AssignmentScopeRow, AssuranceLevel, Principal } from './policy.types';

export interface BuildPrincipalInput {
  userId: string;
  kind: 'STUDENT' | 'STAFF';
  status: AccountStatus;
  roleKeys: RoleKey[];
  assignments: AssignmentScopeRow[];
  assurance: AssuranceLevel;
  orgId?: string;
  /** Optional override of the permission set; defaults to union of role perms. */
  permissionCodes?: Iterable<string>;
}

/**
 * Build a Principal from persisted roles/assignments. The API calls this after
 * resolving the user; the result is cached in Redis keyed by a per-user version
 * that is bumped on any role/assignment/status/MFA change.
 */
export function buildPrincipal(input: BuildPrincipalInput): Principal {
  const isSuperAdmin = input.roleKeys.includes('SUPER_ADMIN');
  const codes = new Set<string>(input.permissionCodes ?? []);
  if (!input.permissionCodes) {
    for (const role of input.roleKeys) {
      for (const code of ROLE_PERMISSIONS[role] ?? []) codes.add(code);
    }
  }
  return {
    userId: input.userId,
    kind: input.kind,
    status: input.status,
    roleKeys: input.roleKeys,
    permissionCodes: codes,
    assignments: input.assignments,
    assurance: input.assurance,
    isSuperAdmin,
    orgId: input.orgId,
  };
}
