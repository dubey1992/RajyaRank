import { NextRequest, NextResponse } from 'next/server';

const LOCALES = ['hi', 'en'];
const DEFAULT = 'en';

const IS_DEV = process.env.NODE_ENV !== 'production';

/** Per-request nonce CSP: in production, scripts run only via the nonce
 *  (+ strict-dynamic) — no 'unsafe-inline'. In development we must allow
 *  'unsafe-eval'/'unsafe-inline' because Next's HMR + React Refresh rely on
 *  eval; a strict policy there blocks hydration and kills all interactivity. */
function buildCsp(nonce: string): string {
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const scriptSrc = IS_DEV
    ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com https://www.googletagmanager.com"
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://checkout.razorpay.com https://www.googletagmanager.com`;
  return [
    "default-src 'self'",
    // https: (not just 'self'/data:/blob:) because blog cover images are a
    // free-text URL an editor can point at any host (BlogManager.tsx) — same
    // reasoning as media-src below. Also covers GA4's rare image-pixel
    // fallback beacon when sendBeacon/fetch aren't available.
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    scriptSrc,
    `connect-src 'self' ${api} https://api.razorpay.com https://*.google-analytics.com https://*.analytics.google.com`,
    // Lesson playback renders VIDEO-embed and PDF-notes assets in an <iframe>
    // (LessonPlayer.tsx) — those need their own frame-src entries or the
    // browser silently blocks the frame with no visible error beyond the
    // console, which read exactly like a broken embed URL even once the URL
    // itself was fixed. YouTube embeds are the only supported external embed
    // provider (createEmbedAsset normalizes to youtube.com/embed); PDF notes
    // load from a short-lived presigned S3 URL, always on this AWS account's
    // region — safe to allow broadly since every URL is individually signed
    // and expiring, not a standing grant to arbitrary bucket content.
    `frame-src https://api.razorpay.com https://checkout.razorpay.com https://www.youtube.com https://www.youtube-nocookie.com https://*.s3.ap-south-1.amazonaws.com${IS_DEV ? ' http://localhost:9000' : ''}`,
    "media-src 'self' blob: https:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
  ].join('; ');
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const ACCESS_COOKIE = 'rr_at';
const REFRESH_COOKIE = 'rr_rt';

// Institute referral attribution (?ref=<their accessCode> on any page).
// First-touch: only set if this browser has no referral cookie yet, so the
// first institute link a visitor clicks keeps credit even if they later
// land on a different institute's link. 30-day attribution window, matching
// typical exam-prep consideration windows (not a hard requirement, just a
// reasonable default — easy to tune later).
const REF_COOKIE = 'rr_ref';
const REF_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// Site-wide maintenance mode — set MAINTENANCE_MODE=true (a plain env var,
// redeploy to flip; there is no DB-backed/admin-toggle version of this) to
// redirect all traffic to /[locale]/maintenance. Checked before the
// token-refresh fetch below so a maintenance window (where the API is
// plausibly down too) never depends on the API responding.
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'true';

/** Silent server-side refresh when the access cookie expired but the refresh
 *  cookie remains — keeps SSR pages authenticated instead of redirecting. */
async function maybeRefresh(req: NextRequest): Promise<{ setCookies: string[]; cookieHeader: string | null }> {
  const hasAccess = !!req.cookies.get(ACCESS_COOKIE)?.value;
  const hasRefresh = !!req.cookies.get(REFRESH_COOKIE)?.value;
  if (hasAccess || !hasRefresh) return { setCookies: [], cookieHeader: null };
  try {
    // See apps/admin/middleware.ts's identical comment: the API's CsrfGuard
    // 403s any POST that doesn't echo the rr_csrf cookie as x-csrf-token,
    // so without this header the silent refresh always failed and an idle
    // session (~10 min) logged the student out on the next SSR navigation.
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

/**
 * Locale routing (explicit NEXT_LOCALE cookie / default hi) + per-request nonce
 * CSP + silent token refresh.
 */
export async function middleware(req: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const csp = buildCsp(nonce);
  const { pathname } = req.nextUrl;

  const hasLocale = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (!hasLocale) {
    const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value;
    const locale = cookieLocale && LOCALES.includes(cookieLocale) ? cookieLocale : DEFAULT;
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(url);
  }

  if (MAINTENANCE_MODE) {
    const locale = LOCALES.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))!;
    const onMaintenancePage = pathname === `/${locale}/maintenance`;
    if (!onMaintenancePage) {
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/maintenance`;
      return NextResponse.redirect(url);
    }
  }

  const { setCookies, cookieHeader } = await maybeRefresh(req);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);
  // not-found.tsx receives no route params in the App Router, so it has no
  // way to know which locale the visitor was actually browsing in — read
  // via headers() in not-found.tsx instead of falling back to the default.
  requestHeaders.set('x-pathname', pathname);
  if (cookieHeader) requestHeaders.set('cookie', cookieHeader);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('content-security-policy', csp);
  for (const c of setCookies) res.headers.append('set-cookie', c);

  const ref = req.nextUrl.searchParams.get('ref');
  if (ref && ref.length <= 40 && !req.cookies.get(REF_COOKIE)) {
    res.cookies.set(REF_COOKIE, ref, { maxAge: REF_COOKIE_MAX_AGE_SECONDS, path: '/', sameSite: 'lax' });
  }

  return res;
}

export const config = { matcher: ['/((?!_next|.*\\..*).*)'] };
