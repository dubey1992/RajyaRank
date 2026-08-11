import { NextRequest, NextResponse } from 'next/server';

const LOCALES = ['hi', 'en'];
const DEFAULT = 'en';

const IS_DEV = process.env.NODE_ENV !== 'production';

/** Stricter than the student app: no third-party scripts/frames, deny framing.
 *  Dev relaxes to 'unsafe-eval'/'unsafe-inline' so Next HMR + React Refresh
 *  hydrate (a strict policy in dev blocks all client interactivity). */
function buildCsp(nonce: string): string {
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  // The content wizard PUTs files directly from the browser to the presigned
  // storage URL (never through the API), so that origin must be allow-listed
  // too — in dev this is the local MinIO endpoint, in prod the real S3/CDN host.
  const storage = process.env.NEXT_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000';
  const scriptSrc = IS_DEV
    ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com"
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://checkout.razorpay.com`;
  return [
    "default-src 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    scriptSrc,
    `connect-src 'self' ${api} ${storage} https://api.razorpay.com https://lumberjack.razorpay.com`,
    'frame-src https://api.razorpay.com https://checkout.razorpay.com',
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const ACCESS_COOKIE = 'rr_admin_at';
const REFRESH_COOKIE = 'rr_admin_rt';

/**
 * When the short-lived access cookie has expired but a valid refresh cookie
 * remains, transparently refresh server-side so SSR pages (getMeOrRedirect)
 * stay authenticated instead of bouncing to login. Returns the API's
 * Set-Cookie headers (for the browser) and an updated cookie string to forward
 * to this request's render.
 */
async function maybeRefresh(req: NextRequest): Promise<{ setCookies: string[]; cookieHeader: string | null }> {
  const hasAccess = !!req.cookies.get(ACCESS_COOKIE)?.value;
  const hasRefresh = !!req.cookies.get(REFRESH_COOKIE)?.value;
  if (hasAccess || !hasRefresh) return { setCookies: [], cookieHeader: null };
  try {
    // The API's global CsrfGuard rejects any POST whose rr_csrf cookie isn't
    // echoed back as x-csrf-token — including this server-side refresh (the
    // guard can't tell first-party middleware from a browser). Forwarding
    // cookies alone therefore 403s, the silent refresh never happens, and
    // every SSR navigation after access-token expiry (~10 min idle) bounced
    // the user to login even with a perfectly valid refresh token.
    const csrf = req.cookies.get('rr_csrf')?.value;
    const r = await fetch(`${API}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        cookie: req.headers.get('cookie') ?? '',
        ...(csrf ? { 'x-csrf-token': csrf } : {}),
      },
    });
    if (!r.ok) return { setCookies: [], cookieHeader: null };
    const setCookies = r.headers.getSetCookie?.() ?? [];
    // Merge the fresh name=value pairs into the forwarded cookie header so the
    // current SSR render is already authenticated.
    const fresh = new Map(setCookies.map((c) => c.split(';')[0]!.split('=') as [string, string]));
    const existing = (req.headers.get('cookie') ?? '')
      .split(';')
      .map((p) => p.trim())
      .filter(Boolean)
      .filter((p) => !fresh.has(p.split('=')[0]!));
    const merged = [...existing, ...[...fresh].map(([k, v]) => `${k}=${v}`)].join('; ');
    return { setCookies, cookieHeader: merged };
  } catch {
    return { setCookies: [], cookieHeader: null };
  }
}

/** Locale routing (explicit cookie/default only) + per-request nonce CSP + silent token refresh. */
export async function middleware(req: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const csp = buildCsp(nonce);
  const { pathname } = req.nextUrl;

  const hasLocale = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (!hasLocale) {
    const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value;
    const locale = cookieLocale && LOCALES.includes(cookieLocale) ? cookieLocale : DEFAULT;
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${pathname === '/' ? '/admin/login' : pathname}`;
    return NextResponse.redirect(url);
  }

  const { setCookies, cookieHeader } = await maybeRefresh(req);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);
  // not-found.tsx receives no route params in the App Router — see the
  // identical comment in apps/web/middleware.ts for why this is needed.
  requestHeaders.set('x-pathname', pathname);
  if (cookieHeader) requestHeaders.set('cookie', cookieHeader);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('content-security-policy', csp);
  for (const c of setCookies) res.headers.append('set-cookie', c);
  return res;
}

export const config = { matcher: ['/((?!_next|.*\\..*).*)'] };
