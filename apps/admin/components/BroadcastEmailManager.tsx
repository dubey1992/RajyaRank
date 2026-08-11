'use client';
import { useEffect, useState } from 'react';
import { Alert, Button, Field, ConfirmDialog, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import type { BroadcastAudienceValue, BroadcastAudienceCountView, BroadcastEmailResult } from '@rajyarank/contracts';

const AUDIENCES: { value: BroadcastAudienceValue; hi: string; en: string }[] = [
  { value: 'ALL_STUDENTS', hi: 'सभी सक्रिय छात्र', en: 'All active students' },
  { value: 'ACADEMIC_HEADS', hi: 'सभी Academic Head', en: 'All Academic Heads' },
  { value: 'ALL_STAFF', hi: 'सभी सक्रिय स्टाफ़', en: 'All active staff' },
];

const inputClass = 'w-full rounded-md border border-line bg-white px-3 py-3 outline-none focus:border-orange-500';

export function BroadcastEmailManager({ locale }: { locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  const [audience, setAudience] = useState<BroadcastAudienceValue>('ALL_STUDENTS');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaHref, setCtaHref] = useState('');
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<'success' | 'error'>('success');

  useEffect(() => {
    let cancelled = false;
    setCountLoading(true);
    apiFetch<BroadcastAudienceCountView>(`/admin/marketing/broadcast-email/audience-count?audience=${audience}`)
      .then((res) => {
        if (!cancelled) setRecipientCount(res.recipientCount);
      })
      .catch(() => {
        if (!cancelled) setRecipientCount(null);
      })
      .finally(() => {
        if (!cancelled) setCountLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [audience]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!subject.trim()) errs.subject = L('विषय दर्ज करें।', 'Enter a subject.');
    if (!message.trim()) errs.message = L('संदेश दर्ज करें।', 'Enter a message.');
    if (ctaHref.trim() && !ctaLabel.trim()) errs.ctaLabel = L('लिंक के लिए बटन का लेबल भी दर्ज करें।', 'A link needs a button label too.');
    if (ctaLabel.trim() && !ctaHref.trim()) errs.ctaHref = L('बटन के लिए लिंक भी दर्ज करें।', 'A button label needs a link too.');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function send() {
    setSending(true);
    try {
      const result = await apiFetch<BroadcastEmailResult>('/admin/marketing/broadcast-email', {
        method: 'POST',
        body: JSON.stringify({
          audience,
          subject: subject.trim(),
          message: message.trim(),
          ...(ctaLabel.trim() && ctaHref.trim() ? { ctaLabel: ctaLabel.trim(), ctaHref: ctaHref.trim() } : {}),
        }),
      });
      setConfirmOpen(false);
      setSubject('');
      setMessage('');
      setCtaLabel('');
      setCtaHref('');
      setToastTone('success');
      setToast(
        L(
          `${result.queued} को भेजा गया${result.skippedMuted ? `, ${result.skippedMuted} ने ईमेल बंद कर रखे हैं` : ''}${result.truncated ? ' — सूची बड़ी होने के कारण सीमित की गई' : ''}।`,
          `Sent to ${result.queued}${result.skippedMuted ? `, ${result.skippedMuted} have email notifications off` : ''}${result.truncated ? ' — list was capped, some recipients were skipped' : ''}.`,
        ),
      );
    } catch (e) {
      setConfirmOpen(false);
      setToastTone('error');
      setToast((e as ApiError).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <h2 className="mb-1 text-lg font-extrabold text-navy-900">{L('प्रचार ईमेल भेजें', 'Send promotional email')}</h2>
      <p className="mb-4 text-sm text-muted">
        {L(
          'एक बार में एक पूरे समूह को ईमेल भेजें। यह वापस नहीं लिया जा सकता — भेजने से पहले सावधानी से समीक्षा करें।',
          'Sends one email to an entire audience segment at once. This cannot be undone — review carefully before sending.',
        )}
      </p>
      {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (validate()) setConfirmOpen(true);
        }}
        className="grid gap-3"
      >
        <div>
          <label htmlFor="broadcast-audience" className="mb-1 block text-sm font-extrabold text-ink">
            {L('किसे भेजें', 'Audience')}
          </label>
          <select
            id="broadcast-audience"
            className={inputClass}
            value={audience}
            onChange={(e) => setAudience(e.target.value as BroadcastAudienceValue)}
          >
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>{L(a.hi, a.en)}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            {countLoading
              ? L('गिनती हो रही है…', 'Counting…')
              : recipientCount === null
                ? L('गिनती लोड नहीं हो सकी।', 'Could not load recipient count.')
                : L(`${recipientCount.toLocaleString('en-IN')} प्राप्तकर्ता`, `${recipientCount.toLocaleString('en-IN')} recipient${recipientCount === 1 ? '' : 's'}`)}
          </p>
        </div>

        <Field label={L('विषय', 'Subject')} name="subject" value={subject} error={errors.subject} onChange={(e) => setSubject(e.target.value)} />

        <div>
          <label htmlFor="broadcast-message" className="mb-1 block text-sm font-extrabold text-ink">
            {L('संदेश', 'Message')}
          </label>
          <textarea
            id="broadcast-message"
            className={inputClass}
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            aria-invalid={errors.message ? true : undefined}
          />
          {errors.message ? <p className="mt-1 text-sm text-danger">{errors.message}</p> : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={L('बटन लेबल (वैकल्पिक)', 'Button label (optional)')} name="ctaLabel" value={ctaLabel} error={errors.ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
          <Field label={L('बटन लिंक (वैकल्पिक)', 'Button link (optional)')} name="ctaHref" value={ctaHref} error={errors.ctaHref} onChange={(e) => setCtaHref(e.target.value)} />
        </div>

        <Button type="submit" variant="secondary">{L('समीक्षा करें और भेजें', 'Review and send')}</Button>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title={L('ईमेल भेजने की पुष्टि करें', 'Confirm sending this email')}
        message={L(
          `यह ${recipientCount ?? '…'} प्राप्तकर्ताओं को तुरंत भेजा जाएगा और इसे वापस नहीं लिया जा सकता।`,
          `This will be sent immediately to ${recipientCount ?? '…'} recipient${recipientCount === 1 ? '' : 's'} and cannot be undone.`,
        )}
        confirmLabel={L('अभी भेजें', 'Send now')}
        cancelLabel={L('रद्द करें', 'Cancel')}
        tone="danger"
        busy={sending}
        onConfirm={() => void send()}
        onCancel={() => setConfirmOpen(false)}
      />
      <Toast message={toast} tone={toastTone} onDismiss={() => setToast(null)} />
    </section>
  );
}
