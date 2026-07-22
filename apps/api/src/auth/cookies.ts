import type { Response } from 'express';
import type { ApiEnv } from '@rajyarank/config/env';

export const ACCESS_COOKIE = 'rr_at';
export const REFRESH_COOKIE = 'rr_rt';

/** Refresh-session lifetime when the user did NOT check "Remember me". Kept
 *  short (vs. the multi-week REFRESH_TOKEN_TTL) so an unattended/shared-device
 *  login doesn't stay signed in for weeks. */
export const NOT_REMEMBERED_REFRESH_TTL_SECONDS = 60 * 60 * 24; // 1 day

/**
 * Cookie names differ by audience so a student token is never usable on admin
 * routes (defence in depth alongside the token `kind`/audience claim).
 */
export function accessCookieName(kind: 'STUDENT' | 'STAFF'): string {
  return kind === 'STAFF' ? 'rr_admin_at' : 'rr_at';
}
export function refreshCookieName(kind: 'STUDENT' | 'STAFF'): string {
  return kind === 'STAFF' ? 'rr_admin_rt' : 'rr_rt';
}

export function setAuthCookies(
  res: Response,
  env: ApiEnv,
  kind: 'STUDENT' | 'STAFF',
  accessToken: string,
  refreshToken: string,
  remember: boolean = true,
) {
  const common = {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    // 'none' is only needed when the frontend and API don't share a parent
    // domain (e.g. this project's current no-custom-domain-yet staging setup,
    // where the frontend is on *.amplifyapp.com and the API on
    // *.cloudfront.net — genuinely different sites as far as SameSite is
    // concerned). Once they share a domain (subdomains of the same site,
    // e.g. api.rajyarank.in + app.rajyarank.in), switch back to 'lax' — it's
    // strictly more secure (real CSRF protection) and works fine for
    // same-site subdomains.
    sameSite: env.COOKIE_SAME_SITE,
    // An empty COOKIE_DOMAIN means "host-only" — scoped exactly to whichever
    // domain issued it, no subdomain sharing. Must NOT be set to a domain
    // that doesn't match the API's own host, or the browser silently
    // refuses to set the cookie at all.
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    path: '/',
  };
  const refreshTtlSeconds = remember ? env.REFRESH_TOKEN_TTL : NOT_REMEMBERED_REFRESH_TTL_SECONDS;
  res.cookie(accessCookieName(kind), accessToken, { ...common, maxAge: env.ACCESS_TOKEN_TTL * 1000 });
  res.cookie(refreshCookieName(kind), refreshToken, { ...common, maxAge: refreshTtlSeconds * 1000 });
}

export function clearAuthCookies(res: Response, env: ApiEnv, kind: 'STUDENT' | 'STAFF') {
  const opts = { ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}), path: '/' };
  res.clearCookie(accessCookieName(kind), opts);
  res.clearCookie(refreshCookieName(kind), opts);
}
