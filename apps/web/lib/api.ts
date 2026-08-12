const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: { path: string; message: string }[];
}

/** Reads the double-submit CSRF cookie (see apps/api/src/authz/csrf.guard.ts)
 *  — deliberately non-httpOnly so it can be read here and echoed back as a
 *  header on state-changing requests. */
function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )rr_csrf=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function rawFetch(path: string, init?: RequestInit): Promise<Response> {
  const csrf = readCsrfCookie();
  return fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(csrf ? { 'x-csrf-token': csrf } : {}),
      ...(init?.headers ?? {}),
    },
  });
}

/** Refresh tokens are single-use (rotation + reuse detection server-side), so
 *  two parallel 401s must NOT each fire their own /auth/refresh — the second
 *  would present the already-rotated token and be treated as theft, revoking
 *  the whole session. All concurrent callers share one in-flight refresh. */
let refreshInFlight: Promise<Response> | null = null;
function refreshOnce(): Promise<Response> {
  refreshInFlight ??= rawFetch('/auth/refresh', { method: 'POST' }).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/** Browser fetch wrapper: forwards cookies, refreshes once on 401, unwraps the envelope. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await rawFetch(path, init);
  if (res.status === 401 && path !== '/auth/refresh') {
    const refreshed = await refreshOnce();
    if (refreshed.ok) res = await rawFetch(path, init);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (body as { error?: ApiError }).error ?? { code: 'INTERNAL_ERROR', message: 'Request failed' };
    throw err;
  }
  return (body as { data: T }).data;
}

// NEXT_PUBLIC_ deliberately, not WEB_PUBLIC_URL — must be build-time inlined,
// not read from the SSR runtime's process.env (Amplify's WEB_COMPUTE platform
// doesn't reliably propagate app-level env vars into the SSR compute layer
// for monorepo builds). This one matters beyond SEO: the Origin header set
// below is what makes AccessGuard's STUDENT-preferred cookie logic trigger
// for SSR requests (see the "shared cookie precedence" fix) — reading the
// localhost fallback here means that Origin never matches the API's
// configured WEB_PUBLIC_URL, silently reverting every server-rendered page
// to the STAFF-first fallback for any browser holding both cookie kinds.
const OWN_PUBLIC_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/** Server-side fetch that forwards the incoming cookie header. A real browser
 *  request always carries an `Origin` header, which the API uses to prefer
 *  the STUDENT cookie over a STAFF one when a browser has both (e.g. a staff
 *  member who is also an enrolled student) — a plain server-to-server fetch
 *  has no Origin at all, so without this the API falls back to STAFF-first
 *  and silently 403s student-only data for that exact case. This call site
 *  only ever proxies requests on behalf of this app's own student users, so
 *  declaring its own public URL here is accurate, not spoofing. */
export async function apiFetchServer<T>(path: string, cookie: string): Promise<T | null> {
  const attempt = async () =>
    fetch(`${API_URL}/api/v1${path}`, { headers: { cookie, origin: OWN_PUBLIC_URL }, cache: 'no-store' });
  let res: Response;
  try {
    res = await attempt();
  } catch {
    // Retry once — a transient network blip (e.g. a cold compute container's
    // first DNS lookup failing) shouldn't bounce an otherwise-valid session
    // to login; see the identical comment in apps/admin/lib/api.ts.
    try {
      res = await attempt();
    } catch {
      return null;
    }
  }
  if (!res.ok) return null;
  const body = await res.json();
  return (body as { data: T }).data;
}

export const API_BASE = API_URL;
