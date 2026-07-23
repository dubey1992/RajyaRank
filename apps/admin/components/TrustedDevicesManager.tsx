'use client';
import { useState } from 'react';
import { Alert, ConfirmDialog, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';

export interface TrustedDeviceView {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
}

function deviceLabel(userAgent: string | null, L: (h: string, e: string) => string): string {
  if (!userAgent) return L('अज्ञात डिवाइस', 'Unknown device');
  if (/edg/i.test(userAgent)) return 'Microsoft Edge';
  if (/chrome/i.test(userAgent)) return 'Chrome';
  if (/firefox/i.test(userAgent)) return 'Firefox';
  if (/safari/i.test(userAgent)) return 'Safari';
  return L('अज्ञात डिवाइस', 'Unknown device');
}

export function TrustedDevicesManager({ initial, locale }: { initial: TrustedDeviceView[]; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [devices, setDevices] = useState(initial);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function revoke(id: string) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/auth/trusted-devices/${id}`, { method: 'DELETE' });
      setDevices((prev) => prev.filter((d) => d.id !== id));
      setToast(L('डिवाइस को अविश्वसनीय बना दिया गया।', 'Device untrusted.'));
      setPendingId(null);
    } catch (e) {
      setError((e as ApiError).message ?? L('कुछ गलत हो गया।', 'Something went wrong.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <h2 className="mb-1 text-lg font-black text-navy-900">{L('विश्वसनीय डिवाइस', 'Trusted devices')}</h2>
      <p className="mb-4 text-sm text-muted">
        {L(
          'जिन डिवाइसों पर आपने "इस डिवाइस पर याद रखें" चुना है, वे 60 दिनों तक बिना 2FA कोड के लॉगिन कर सकते हैं।',
          'Devices where you chose "Trust this device" can sign in without a 2FA code for 60 days.',
        )}
      </p>
      {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}
      <Toast message={toast} onDismiss={() => setToast(null)} />
      {devices.length === 0 ? (
        <p className="text-sm text-muted">{L('कोई विश्वसनीय डिवाइस नहीं।', 'No trusted devices.')}</p>
      ) : (
        <div className="grid gap-2">
          {devices.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface-soft p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-extrabold text-navy-900">
                  {deviceLabel(d.userAgent, L)}
                  {d.current ? (
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-extrabold text-success">
                      {L('यह डिवाइस', 'This device')}
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 text-xs text-muted">
                  {d.ip ?? L('अज्ञात IP', 'Unknown IP')} · {L('अंतिम उपयोग', 'Last used')} {new Date(d.lastUsedAt).toLocaleDateString(hi ? 'hi-IN' : 'en-IN')} ·{' '}
                  {L('समाप्ति', 'Expires')} {new Date(d.expiresAt).toLocaleDateString(hi ? 'hi-IN' : 'en-IN')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingId(d.id)}
                className="rounded-md border border-line px-3 py-1.5 text-xs font-extrabold text-danger hover:bg-orange-50 disabled:opacity-50"
              >
                {L('अविश्वसनीय बनाएँ', 'Revoke')}
              </button>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={pendingId !== null}
        title={L('डिवाइस को अविश्वसनीय बनाएँ?', 'Untrust this device?')}
        message={L('अगली बार लॉगिन पर इसे 2FA कोड फिर से माँगा जाएगा।', 'It will be asked for a 2FA code again on its next login.')}
        confirmLabel={L('अविश्वसनीय बनाएँ', 'Revoke')}
        cancelLabel={L('रद्द करें', 'Cancel')}
        tone="danger"
        busy={busy}
        onConfirm={() => pendingId && void revoke(pendingId)}
        onCancel={() => setPendingId(null)}
      />
    </section>
  );
}
