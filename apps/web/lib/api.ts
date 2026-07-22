const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: { path: string; message: string }[];
}

function rawFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
}

/** Browser fetch wrapper: forwards cookies, refreshes once on 401, unwraps the envelope. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await rawFetch(path, init);
  if (res.status === 401 && path !== '/auth/refresh') {
    const refreshed = await rawFetch('/auth/refresh', { method: 'POST' });
    if (refreshed.ok) res = await rawFetch(path, init);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (body as { error?: ApiError }).error ?? { code: 'INTERNAL_ERROR', message: 'Request failed' };
    throw err;
  }
  return (body as { data: T }).data;
}

const OWN_PUBLIC_URL = process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000';

/** Server-side fetch that forwards the incoming cookie header. A real browser
 *  request always carries an `Origin` header, which the API uses to prefer
 *  the STUDENT cookie over a STAFF one when a browser has both (e.g. a staff
 *  member who is also an enrolled student) — a plain server-to-server fetch
 *  has no Origin at all, so without this the API falls back to STAFF-first
 *  and silently 403s student-only data for that exact case. This call site
 *  only ever proxies requests on behalf of this app's own student users, so
 *  declaring its own public URL here is accurate, not spoofing. */
export async function apiFetchServer<T>(path: string, cookie: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1${path}`, {
      headers: { cookie, origin: OWN_PUBLIC_URL },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = await res.json();
    return (body as { data: T }).data;
  } catch {
    return null;
  }
}

export const API_BASE = API_URL;
