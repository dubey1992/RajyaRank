'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Field, Toast, ConfirmDialog } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import type { AnnouncementAudience, AnnouncementView } from '@rajyarank/contracts';

const AUDIENCES: { value: AnnouncementAudience; hi: string; en: string }[] = [
  { value: 'ALL', hi: 'सभी उपयोगकर्ता', en: 'All users' },
  { value: 'STUDENTS', hi: 'केवल छात्र', en: 'Students only' },
  { value: 'STAFF', hi: 'केवल स्टाफ़', en: 'Staff only' },
];

export function AnnouncementComposer({ initial, locale }: { initial: AnnouncementView[]; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const router = useRouter();
  const [rows, setRows] = useState<AnnouncementView[]>(initial);
  const [toast, setToast] = useState<string | null>(null);

  const [titleHi, setTitleHi] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [bodyHi, setBodyHi] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>('ALL');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!titleHi.trim()) errs.titleHi = L('हिन्दी शीर्षक दर्ज करें।', 'Enter the Hindi title.');
    if (!titleEn.trim()) errs.titleEn = L('English शीर्षक दर्ज करें।', 'Enter the English title.');
    if (!bodyHi.trim()) errs.bodyHi = L('हिन्दी विवरण दर्ज करें।', 'Enter the Hindi message.');
    if (!bodyEn.trim()) errs.bodyEn = L('English विवरण दर्ज करें।', 'Enter the English message.');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function send() {
    setBusy(true);
    try {
      const created = await apiFetch<AnnouncementView>('/admin/announcements', {
        method: 'POST',
        body: JSON.stringify({ titleHi: titleHi.trim(), titleEn: titleEn.trim(), bodyHi: bodyHi.trim(), bodyEn: bodyEn.trim(), audience }),
      });
      setRows((r) => [created, ...r]);
      setTitleHi(''); setTitleEn(''); setBodyHi(''); setBodyEn(''); setAudience('ALL'); setErrors({});
      setToast(L(`भेजा गया — ${created.recipientCount} प्राप्तकर्ता।`, `Sent — ${created.recipientCount} recipient(s).`));
      router.refresh();
    } catch (e) {
      setToast((e as ApiError).message);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  const audienceLabel = (a: AnnouncementAudience) => hi ? AUDIENCES.find((x) => x.value === a)?.hi : AUDIENCES.find((x) => x.value === a)?.en;

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('नई घोषणा भेजें', 'Send a new announcement')}</h2>
        {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (validate()) setConfirming(true);
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <Field label={L('शीर्षक (हिन्दी)', 'Title (Hindi)')} name="titleHi" value={titleHi} error={errors.titleHi} onChange={(e) => setTitleHi(e.target.value)} />
          <Field label={L('शीर्षक (English)', 'Title (English)')} name="titleEn" value={titleEn} error={errors.titleEn} onChange={(e) => setTitleEn(e.target.value)} />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-extrabold text-ink">{L('संदेश (हिन्दी)', 'Message (Hindi)')}</label>
            <textarea value={bodyHi} onChange={(e) => setBodyHi(e.target.value)} className="min-h-[90px] w-full rounded-md border border-line px-3 py-2 text-sm" />
            {errors.bodyHi ? <p className="mt-1 text-sm text-danger">{errors.bodyHi}</p> : null}
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-extrabold text-ink">{L('संदेश (English)', 'Message (English)')}</label>
            <textarea value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} className="min-h-[90px] w-full rounded-md border border-line px-3 py-2 text-sm" />
            {errors.bodyEn ? <p className="mt-1 text-sm text-danger">{errors.bodyEn}</p> : null}
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-extrabold text-ink">{L('प्राप्तकर्ता', 'Audience')}</label>
            <select value={audience} onChange={(e) => setAudience(e.target.value as AnnouncementAudience)} className="w-full rounded-md border border-line px-3 py-2 text-sm">
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>{hi ? a.hi : a.en}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" className="w-full">{L('समीक्षा करें व भेजें', 'Review and send')}</Button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('हाल की घोषणाएँ', 'Recent announcements')} ({rows.length})</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">{L('अभी कोई घोषणा नहीं भेजी गई।', 'No announcements sent yet.')}</p>
        ) : (
          <ul className="grid gap-2">
            {rows.map((r) => (
              <li key={r.id} className="rounded-md border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-ink">{hi ? r.titleHi : r.titleEn}</div>
                  <div className="text-xs text-muted">{audienceLabel(r.audience)} · {r.recipientCount} {L('प्राप्तकर्ता', 'recipients')} · {new Date(r.createdAt).toLocaleString(hi ? 'hi-IN' : 'en-IN')}</div>
                </div>
                <p className="mt-1 text-sm text-muted">{hi ? r.bodyHi : r.bodyEn}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={confirming}
        title={L('यह घोषणा भेजें?', 'Send this announcement?')}
        message={L(
          `यह "${audienceLabel(audience)}" को ईमेल व इन-ऐप सूचना के रूप में तुरंत भेजा जाएगा। यह पूर्ववत नहीं किया जा सकता।`,
          `This will be sent immediately by email and in-app notification to "${audienceLabel(audience)}". This cannot be undone.`,
        )}
        confirmLabel={L('भेजें', 'Send')}
        cancelLabel={L('रद्द करें', 'Cancel')}
        tone="danger"
        busy={busy}
        onConfirm={() => void send()}
        onCancel={() => setConfirming(false)}
      />
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </div>
  );
}
