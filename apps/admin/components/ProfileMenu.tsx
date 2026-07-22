'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { MeResponse } from '@rajyarank/contracts';
import { apiFetch } from '@/lib/api';
import { roleLabel } from '@/lib/labels';
import type { Locale } from '@/lib/i18n';

function initialsOf(name: string | null): string {
  if (!name) return 'S';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || 'S';
}

/** Avatar + dropdown (Account settings / Help & Support / Sign out) — mirrors
 *  the student app's StudentShell profile menu, replacing the bare profile
 *  link + separate logout button previously here. */
export function ProfileMenu({ me, locale }: { me: MeResponse; locale: Locale }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      /* navigate regardless */
    } finally {
      window.location.assign(`/${locale}/admin/login`);
    }
  }

  const primaryRole = me.roleKeys[0];

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-2.5 rounded-lg p-1">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-navy-900 to-navy-700 text-xs font-black text-white">
          {initialsOf(me.displayName)}
        </span>
        <span className="hidden text-left sm:block">
          <strong className="block text-xs text-navy-900">{me.displayName ?? L('स्टाफ़', 'Staff')}</strong>
          {primaryRole ? <small className="block text-[10px] text-muted">{roleLabel(primaryRole, locale)}</small> : null}
        </span>
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[46px] z-50 w-52 rounded-xl border border-line bg-white p-1.5 shadow-[0_18px_48px_rgba(6,29,49,0.14)]">
            <Link href={`/${locale}/admin/profile`} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-xs font-bold text-ink hover:bg-surface-soft">
              {L('अकाउंट सेटिंग्स', 'Account settings')}
            </Link>
            <Link href={`/${locale}/admin/help`} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-xs font-bold text-ink hover:bg-surface-soft">
              {L('सहायता और सपोर्ट', 'Help & Support')}
            </Link>
            <button type="button" disabled={busy} onClick={() => void logout()} className="block w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-danger hover:bg-surface-soft disabled:opacity-60">
              {busy ? L('साइन आउट हो रहा है…', 'Signing out…') : L('साइन आउट', 'Sign out')}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
