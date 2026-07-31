'use client';
import { useEffect } from 'react';

const REFRESH_INTERVAL_MS = 60_000;

/** Reloads the page periodically so a visitor's open tab recovers on its own
 *  once MAINTENANCE_MODE is flipped off and redeployed — no manual refresh
 *  needed. A full reload (not a fetch/poll) so it also picks up a genuinely
 *  new deployment, not just a config flag. */
export function MaintenanceAutoRefresh() {
  useEffect(() => {
    const id = setInterval(() => window.location.reload(), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
  return null;
}
