import { SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { ResourceContext } from '@rajyarank/auth';

export const PERMISSION_KEY = 'rr:permission';
export const RESOURCE_RESOLVER_KEY = 'rr:resourceResolver';

export interface RequirePermissionMeta {
  code: string;
  assurance?: 'AAL2';
}

/**
 * Declare the permission an endpoint needs. Authorization is delegated to the
 * central policy engine — controllers never inspect role names.
 */
export const RequirePermission = (code: string, opts?: { assurance?: 'AAL2' }) =>
  SetMetadata(PERMISSION_KEY, { code, assurance: opts?.assurance } satisfies RequirePermissionMeta);

export type ResourceResolver = (req: Request) => ResourceContext | Promise<ResourceContext>;

/**
 * Declare how to build the resource scope/ownership/status for this endpoint,
 * enabling the policy engine's ownership/status/scope checks (policy.engine.ts
 * steps 4 and 6) for this specific route.
 *
 * NOTE (as of this writing): no controller in this codebase actually uses this
 * decorator — PermissionsGuard reads it correctly if present, but every
 * currently-scoped endpoint instead enforces tenant isolation manually in its
 * service layer (e.g. `orgId`-filtered lookups — see
 * apps/api/src/students/students.service.ts's `requireStudent` for the
 * canonical pattern, mirrored in staff-admin/doubts/support). That manual
 * pattern is what's actually relied on for tenant isolation today; treat
 * wiring up ResourceFrom as an intentional, separate defense-in-depth
 * project, not something already providing protection.
 */
export const ResourceFrom = (resolver: ResourceResolver) => SetMetadata(RESOURCE_RESOLVER_KEY, resolver);
