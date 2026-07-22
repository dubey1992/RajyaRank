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

/** Declare how to build the resource scope/ownership/status for this endpoint. */
export const ResourceFrom = (resolver: ResourceResolver) => SetMetadata(RESOURCE_RESOLVER_KEY, resolver);
