import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Principal } from '@rajyarank/auth';
import type { ApiEnv } from '@rajyarank/config/env';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { ALLOW_SUSPENDED_ORG_KEY } from '../common/decorators/allow-suspended-org.decorator';
import { TokenService, type AccessClaims } from './token.service';
import { AuthorizationService } from '../authz/authorization.service';
import { ENV } from '../config/config.module';
import { accessCookieName } from './cookies';
import { AppError } from '../common/errors/app-error';

/**
 * Global authentication guard. Verifies the access token (cookie or bearer),
 * resolves the Principal via the central authorization service, and attaches
 * it to the request. @Public routes skip authentication.
 */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly authz: AuthorizationService,
    @Inject(ENV) private readonly env: ApiEnv,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<
      Request & { principal?: Principal; auth?: AccessClaims; cookies?: Record<string, string> }
    >();

    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException();

    let claims: AccessClaims;
    try {
      claims = this.tokens.verifyAccess(token);
    } catch {
      throw new UnauthorizedException();
    }

    const principal = await this.authz.resolvePrincipal(claims.sub, claims.assurance);
    if (!principal || principal.status !== 'ACTIVE') throw new UnauthorizedException();

    // A suspended institution detaches every one of its members — staff AND
    // students alike, not just permission-gated staff actions — from the
    // platform until it's reactivated. Checked here (not only in the policy
    // engine) so it's enforced on every request, including routes with no
    // @RequirePermission at all (most student routes). @AllowSuspendedOrg
    // carves out the handful of routes a detached member still needs: see
    // why they're locked out (auth/me), sign out, and contact support.
    const allowSuspendedOrg = this.reflector.getAllAndOverride<boolean>(ALLOW_SUSPENDED_ORG_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (principal.orgId && principal.orgActive === false && !allowSuspendedOrg) {
      throw AppError.institutionSuspended();
    }

    req.auth = claims;
    req.principal = principal;
    return true;
  }

  /**
   * COOKIE_DOMAIN is deliberately shared (e.g. `.rajyarank.com`) so a staff
   * login on the web app's staff tab can hand off an already-authenticated
   * session to the admin portal (see AuthController). The side effect: a
   * browser that has EVER logged into the admin portal keeps a live STAFF
   * cookie, which — with a fixed `STAFF ?? STUDENT` lookup order — silently
   * shadowed every student-only endpoint for that browser (e.g. a Content
   * Admin who is also an enrolled student got 403s on /student/* forever,
   * with no obvious cause). Origin tells us which app is actually asking:
   * the web app never needs the STAFF cookie for itself (it only ever
   * captures one to immediately redirect to ADMIN_PUBLIC_URL), so prefer
   * STUDENT there; keep the original STAFF-first order for the admin origin
   * and for anything without a recognizable Origin (same-origin/non-browser
   * callers), where the old behavior was never actually wrong.
   */
  private extractToken(req: Request & { cookies?: Record<string, string> }): string | null {
    const auth = req.header('authorization');
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    const staff = req.cookies?.[accessCookieName('STAFF')] ?? null;
    const student = req.cookies?.[accessCookieName('STUDENT')] ?? null;
    if (req.header('origin') === this.env.WEB_PUBLIC_URL) return student ?? staff;
    return staff ?? student;
  }
}
