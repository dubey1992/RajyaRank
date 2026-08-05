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

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await rawFetch(path, init);
  // Access token expires (~10 min); transparently refresh once on 401 and retry
  // so an idle session doesn't surface as a spurious error / forced re-login.
  if (res.status === 401 && path !== '/auth/refresh') {
    const refreshed = await refreshOnce();
    if (refreshed.ok) res = await rawFetch(path, init);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw (body as { error?: ApiError }).error ?? { code: 'INTERNAL_ERROR', message: 'Request failed' };
  }
  return (body as { data: T }).data;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Downloads a binary response (e.g. a generated PDF) as a file — apiFetch
 *  always parses JSON, so file endpoints need their own client-side path. */
export async function apiDownload(path: string, filename: string): Promise<void> {
  let res = await rawFetch(path);
  if (res.status === 401) {
    const refreshed = await refreshOnce();
    if (refreshed.ok) res = await rawFetch(path);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw (body as { error?: ApiError }).error ?? { code: 'INTERNAL_ERROR', message: 'Download failed' };
  }
  saveBlob(await res.blob(), filename);
}

/** For files that live off-origin behind a presigned URL (S3/CDN): fetches the
 *  presigned URL itself from our API (credentialed, cookies needed) and then
 *  the object at that URL as a SEPARATE, uncredentialed request. Storage
 *  origins are authenticated via the URL's own signature, never cookies —
 *  and a wildcard-CORS bucket (the normal config for presigned downloads)
 *  rejects a credentialed cross-origin request outright, so `apiDownload`'s
 *  credentials:'include' can't be allowed to carry over the redirect here. */
export async function apiDownloadPresigned(urlPath: string, filename: string): Promise<void> {
  const { url } = await apiFetch<{ url: string }>(urlPath);
  const res = await fetch(url);
  if (!res.ok) throw { code: 'INTERNAL_ERROR', message: 'Download failed' } as ApiError;
  saveBlob(await res.blob(), filename);
}

/** Retries once on a network-level failure (e.g. a transient DNS blip from a
 *  cold Lambda container) — without this, one bad `getaddrinfo` on an
 *  otherwise-valid session bounced the user straight to login, which reads
 *  as "randomly logged out" since it's whichever compute container happens
 *  to serve that particular navigation. An actual 4xx/5xx from the API
 *  still resolves to null immediately; this only guards the fetch itself. */
export async function apiFetchServer<T>(path: string, cookie: string): Promise<T | null> {
  const attempt = async () => fetch(`${API_URL}/api/v1${path}`, { headers: { cookie }, cache: 'no-store' });
  let res: Response;
  try {
    res = await attempt();
  } catch {
    try {
      res = await attempt();
    } catch {
      return null;
    }
  }
  if (!res.ok) return null;
  return ((await res.json()) as { data: T }).data;
}
