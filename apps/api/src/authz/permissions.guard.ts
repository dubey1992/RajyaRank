import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Principal } from '@rajyarank/auth';
import { AuthorizationService } from './authorization.service';
import { PERMISSION_KEY, RESOURCE_RESOLVER_KEY, type RequirePermissionMeta, type ResourceResolver } from './decorators';
import { AppError } from '../common/errors/app-error';

/**
 * Enforces @RequirePermission via the central policy engine. On denial it
 * writes an audit event and throws a 403 with the stable PERMISSION_DENIED
 * code. Endpoints without @RequirePermission are not gated here (auth is still
 * enforced by the global access guard unless @Public).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authz: AuthorizationService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<RequirePermissionMeta | undefined>(PERMISSION_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!meta) return true;

    const req = ctx.switchToHttp().getRequest<Request & { principal?: Principal; correlationId?: string }>();
    const principal = req.principal;
    if (!principal) throw AppError.permissionDenied();

    const resolver = this.reflector.get<ResourceResolver | undefined>(RESOURCE_RESOLVER_KEY, ctx.getHandler());
    const resource = resolver ? await resolver(req) : undefined;

    const decision = this.authz.check(principal, meta.code, resource, meta.assurance);
    if (!decision.allow) {
      await this.authz.auditDenied({
        principal,
        permission: meta.code,
        decision,
        correlationId: req.correlationId,
        ip: req.ip,
        userAgent: req.header('user-agent') ?? null,
      });
      throw AppError.permissionDenied();
    }
    return true;
  }
}
