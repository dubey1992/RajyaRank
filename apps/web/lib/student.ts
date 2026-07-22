import type { MeResponse } from '@rajyarank/contracts';
import { apiFetchServer } from '@/lib/api';

/** Two-letter avatar initials from a display name (falls back to "S"). */
export function initialsOf(name: string | null): string {
  if (!name) return 'S';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || 'S';
}

/** Authenticated identity for the student shell. Null when unauthenticated. */
export function getMe(cookie: string): Promise<MeResponse | null> {
  return apiFetchServer<MeResponse>('/auth/me', cookie);
}
