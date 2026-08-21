'use client';
import { useState } from 'react';
import { ConfirmDialog, Alert } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';

/** Doesn't delete anything itself — files an ACCOUNT_DELETION support ticket
 *  (same infra every other ticket category uses) so staff can verify and
 *  action it via StudentsService.deleteAccount. Matches the "delete from
 *  your profile page, or via our Contact page" process the public privacy
 *  policy already promises. */
export function DeleteAccountSection({ locale }: { locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/student/support-tickets', {
        method: 'POST',
        body: JSON.stringify({
          category: 'ACCOUNT_DELETION',
          subject: 'Account deletion request',
          bodyText: 'I would like to permanently delete my RajyaRank account and all associated personal data.',
        }),
      });
      setDone(true);
      setOpen(false);
    } catch (e) {
      setError((e as ApiError).message ?? L('अनुरोध विफल रहा।', 'Request failed.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[18px] border border-danger/30 bg-white p-5 shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
      <h2 className="mb-1 text-base font-black tracking-tight text-danger">{L('डेंजर ज़ोन', 'Danger zone')}</h2>
      <p className="mb-4 text-xs text-muted">
        {L(
          'आपका खाता हटाने पर आपका नाम, ईमेल व फ़ोन नंबर स्थायी रूप से हटा दिया जाएगा और आप हर जगह से लॉग आउट हो जाएंगे। ऑर्डर व भुगतान रिकॉर्ड कानूनी/लेखा कारणों से बने रहेंगे।',
          'Deleting your account permanently removes your name, email, and phone number, and signs you out everywhere. Order and payment records are kept for legal/accounting reasons.',
        )}
      </p>
      {done ? (
        <Alert tone="success">
          {L("अनुरोध प्राप्त हुआ — हम इसे कुछ कार्य दिवसों में संसाधित करेंगे।", "Request received — we'll process it within a few business days.")}
        </Alert>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border border-danger px-4 py-2 text-sm font-extrabold text-danger hover:bg-danger/5"
        >
          {L('मेरा खाता हटाएं', 'Delete my account')}
        </button>
      )}
      {error ? <div className="mt-3"><Alert tone="error">{error}</Alert></div> : null}

      <ConfirmDialog
        open={open}
        title={L('खाता हटाएं?', 'Delete your account?')}
        message={L(
          "यह स्थायी रूप से आपका नाम, ईमेल व फ़ोन नंबर हटा देगा और आपको हर डिवाइस से लॉग आउट कर देगा। इसे वापस नहीं किया जा सकता। हम अनुरोध को कुछ कार्य दिवसों में संसाधित करेंगे।",
          "This permanently removes your name, email, and phone number, and signs you out of every device. It can't be undone. We'll process the request within a few business days.",
        )}
        confirmLabel={L('मेरा खाता हटाएं', 'Delete my account')}
        cancelLabel={L('रद्द करें', 'Cancel')}
        tone="danger"
        busy={busy}
        onConfirm={() => void submit()}
        onCancel={() => setOpen(false)}
      />
    </section>
  );
}
