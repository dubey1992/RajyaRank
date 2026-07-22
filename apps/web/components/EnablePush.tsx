'use client';
import { useState } from 'react';
import { enablePush } from '@/lib/push';

/** "Enable push notifications" button (§17). No-ops gracefully when the server
 *  has no VAPID keys or the browser denies permission. */
export function EnablePush({ locale }: { locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [state, setState] = useState<'idle' | 'busy' | 'enabled' | 'denied' | 'unsupported' | 'unavailable'>('idle');

  const label =
    state === 'enabled'
      ? L('पुश सूचनाएँ चालू', 'Push notifications on')
      : state === 'denied'
        ? L('अनुमति अस्वीकृत', 'Permission denied')
        : state === 'unsupported'
          ? L('इस ब्राउज़र में असमर्थित', 'Not supported in this browser')
          : state === 'unavailable'
            ? L('अभी उपलब्ध नहीं', 'Not available right now')
            : L('पुश सूचनाएँ चालू करें', 'Enable push notifications');

  return (
    <button
      type="button"
      disabled={state === 'busy' || state === 'enabled'}
      onClick={async () => {
        setState('busy');
        setState(await enablePush());
      }}
      className="rounded-md border border-line px-3 py-2 text-sm font-extrabold text-navy-900 hover:bg-surface-soft disabled:opacity-60"
    >
      {state === 'busy' ? L('…', '…') : label}
    </button>
  );
}
