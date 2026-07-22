import type { MeResponse } from '@rajyarank/contracts';

/**
 * UI-only permission hints. These improve UX (hide/disable controls) but are
 * NEVER trusted for security — the backend re-checks every protected action via
 * the central policy engine and returns 403 PERMISSION_DENIED regardless of
 * what the client renders.
 */
export function can(me: MeResponse | null, code: string): boolean {
  if (!me) return false;
  return me.permissionCodes.includes(code);
}
