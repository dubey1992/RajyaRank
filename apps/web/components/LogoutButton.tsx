'use client';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';

/** Revokes the current session server-side (clears auth cookies) then returns
 *  to the login page. Navigates regardless of the API outcome. */
export function LogoutButton({ locale }: { locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      /* ignore — navigate home either way */
    } finally {
      window.location.assign(`/${locale}/login`);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={busy}
      className="font-extrabold text-navy-900 hover:text-orange-600 disabled:opacity-60"
    >
      {busy ? (hi ? 'लॉगआउट…' : 'Logging out…') : hi ? 'लॉगआउट' : 'Logout'}
    </button>
  );
}
