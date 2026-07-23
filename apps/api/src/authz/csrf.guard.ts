import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { CSRF_COOKIE } from '../auth/cookies';
import { AppError } from '../common/errors/app-error';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit-cookie CSRF defense. SameSite alone stops being a real CSRF
 * defense once cookies must be SameSite=None (this project's current staging
 * setup, where the frontend and API don't share a parent domain — and any
 * future multi-CDN production topology). Stateless: no server-side token
 * storage — a request is only trusted if its X-CSRF-Token header matches the
 * rr_csrf cookie value, which a third-party page can never read (cookies
 * aren't readable cross-origin via document.cookie), so it can never forge a
 * matching header even though it can trigger a cookie-bearing request.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request & { cookies?: Record<string, string> }>();
    if (SAFE_METHODS.has(req.method)) return true;

    const csrfCookie = req.cookies?.[CSRF_COOKIE];
    // No session cookie at all — nothing to protect (an unauthenticated
    // @Public() POST like /contact, or AccessGuard will reject the request
    // anyway for a protected route with no session).
    if (!csrfCookie) return true;

    const header = req.header('x-csrf-token');
    if (!header || header !== csrfCookie) {
      throw AppError.permissionDenied('Missing or invalid CSRF token.');
    }
    return true;
  }
}
