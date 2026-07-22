'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, ConfirmDialog, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import type { JoinInstitutionResponse } from '@rajyarank/contracts';

/** Self-service institution membership — distinct from the checkout access
 *  code (which only unlocks a discount for one order and never touches
 *  membership). Entering the same code HERE makes the student a real member:
 *  institute badge, institute-only course visibility, no re-entering a code
 *  at checkout again. */
export function JoinInstitutionForm({
  locale,
  institution,
}: {
  locale: 'hi' | 'en';
  institution: { name: string } | null;
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmingLeave, setConfirmingLeave] = useState(false);

  async function join() {
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<JoinInstitutionResponse>('/student/institution/join', {
        method: 'POST',
        body: JSON.stringify({ accessCode: code.trim() }),
      });
      setToast(L(`आप अब ${res.orgName} के सदस्य हैं।`, `You're now a member of ${res.orgName}.`));
      setCode('');
      router.refresh();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    setBusy(true);
    try {
      await apiFetch('/student/institution/leave', { method: 'POST' });
      setToast(L('आप संस्थान से अलग हो गए।', "You've left the institution."));
      router.refresh();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
      setConfirmingLeave(false);
    }
  }

  if (institution) {
    return (
      <div>
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-navy-100 px-3 py-1.5 text-[11px] font-extrabold text-navy-800">
          🏛 {institution.name}
        </div>
        <p className="mb-3 text-xs text-muted">
          {L('आपके संस्थान के कोर्स व विशेष मूल्य आपके खाते में स्वतः लागू हैं।', "Your institute's courses and special pricing apply automatically to your account.")}
        </p>
        <Button variant="secondary" onClick={() => setConfirmingLeave(true)}>{L('संस्थान से अलग हों', 'Leave institution')}</Button>
        <ConfirmDialog
          open={confirmingLeave}
          title={L('संस्थान से अलग होना चाहते हैं?', 'Leave this institution?')}
          message={L('आप अपने संस्थान के विशेष कोर्स व मूल्य खो देंगे। आप बाद में फिर से शामिल हो सकते हैं।', "You'll lose access to your institute's special courses and pricing. You can rejoin later.")}
          confirmLabel={L('अलग हों', 'Leave')}
          cancelLabel={L('रद्द करें', 'Cancel')}
          tone="danger"
          busy={busy}
          onConfirm={() => void leave()}
          onCancel={() => setConfirmingLeave(false)}
        />
        <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <p className="mb-3 text-xs text-muted">
        {L(
          'अपने संस्थान से मिला कोड दर्ज करें — इससे आपके संस्थान के कोर्स व स्थायी संस्थान मूल्य अनलॉक होंगे। यह चेकआउट पर दर्ज किए जाने वाले एक-बार के छूट कोड से अलग है।',
          "Enter the code your institute gave you — this unlocks institute courses and permanent institute pricing. It's separate from the one-time discount code you can enter at checkout.",
        )}
      </p>
      {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void join();
        }}
        className="flex gap-2"
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={L('संस्थान कोड', 'Institution code')}
          className="flex-1 rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-500"
        />
        <Button type="submit" loading={busy} disabled={!code.trim()}>{L('शामिल हों', 'Join')}</Button>
      </form>
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </div>
  );
}
