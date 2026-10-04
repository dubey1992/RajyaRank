'use client';
import { useState } from 'react';
import { Alert, Button } from '@rajyarank/ui';
import { createTicketSchema } from '@rajyarank/contracts';
import type { Locale } from '@/lib/i18n';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors, validate } from '@/lib/form';

/** Shown while the institution itself is suspended (orgSuspended) — every
 *  other route is blocked for this member (see apps/api's AccessGuard), so
 *  this banner (and the auth/me call that drives it) is one of the only
 *  things still reachable. No billing CTA — paying doesn't fix a
 *  suspension, only RajyaRank support reactivating it does. The "Contact
 *  support" link expands a minimal inline ticket form (posting to
 *  staff/my-support-tickets, also exempted from the lockout) rather than a
 *  mailto dead end — this is deliberately small: a subject/body quick-send,
 *  not a full ticket inbox. Priority over the trial banners in Shell.tsx:
 *  a suspended org's trial state is moot. */
export function SuspendedBanner({ locale }: { locale: Locale }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [open, setOpen] = useState(false);
  const [bodyText, setBodyText] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  const payload = {
    category: 'ACCOUNT' as const,
    subject: L('संस्थान निलंबित — सहायता चाहिए', 'Institution suspended — need help'),
    bodyText,
  };

  async function submit() {
    const errs = validate(createTicketSchema, payload);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await apiFetch('/staff/my-support-tickets', { method: 'POST', body: JSON.stringify(payload) });
      setSent(true);
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-danger px-4 py-2 text-[13px] text-white">
      <div className="flex flex-wrap items-center justify-center gap-2 text-center font-bold">
        <span>
          {hi
            ? 'आपका संस्थान वर्तमान में निलंबित है। अधिकतर सुविधाएं उपलब्ध नहीं हैं।'
            : 'Your institution is currently suspended. Most features are unavailable.'}
        </span>
        {sent ? null : (
          <button type="button" onClick={() => setOpen((v) => !v)} className="font-black underline">
            {hi ? 'सहायता से संपर्क करें →' : 'Contact support →'}
          </button>
        )}
      </div>
      {open && !sent ? (
        <div className="mx-auto mt-2 max-w-md rounded-md bg-white p-3 text-left text-ink">
          {errors._form ? <div className="mb-2"><Alert tone="error">{errors._form}</Alert></div> : null}
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={3}
            placeholder={L('क्या हुआ, बताएं…', 'Describe what happened…')}
            className="w-full rounded-md border border-line p-2 text-sm"
          />
          {errors.bodyText ? <p className="mt-1 text-xs font-bold text-danger">{errors.bodyText}</p> : null}
          <div className="mt-2 flex justify-end">
            <Button type="button" loading={busy} onClick={() => void submit()}>
              {L('भेजें', 'Send')}
            </Button>
          </div>
        </div>
      ) : null}
      {sent ? (
        <div className="mx-auto mt-2 max-w-md">
          <Alert tone="success">
            {L('आपका संदेश भेज दिया गया है। हमारी टीम जल्द संपर्क करेगी।', "Your message has been sent. Our team will reach out shortly.")}
          </Alert>
        </div>
      ) : null}
    </div>
  );
}
