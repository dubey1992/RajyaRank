'use client';
import { useState } from 'react';
import { Alert, Button, Field, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';
import type { MarketingBannerView } from '@rajyarank/contracts';

/** Editor for the homepage's animated top announcement bar — a singleton,
 *  unlike Testimonials/FAQs/Study Content Teasers above it on this page,
 *  so this is a single form rather than a list + create form. */
export function BannerManager({ initial, locale }: { initial: MarketingBannerView | null; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [enabled, setEnabled] = useState(initial?.enabled ?? false);
  const [messageHi, setMessageHi] = useState(initial?.messageHi ?? '');
  const [messageEn, setMessageEn] = useState(initial?.messageEn ?? '');
  const [ctaLabelHi, setCtaLabelHi] = useState(initial?.ctaLabelHi ?? '');
  const [ctaLabelEn, setCtaLabelEn] = useState(initial?.ctaLabelEn ?? '');
  const [ctaHref, setCtaHref] = useState(initial?.ctaHref ?? '');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function save() {
    const errs: Record<string, string> = {};
    if (!messageHi.trim()) errs.messageHi = L('हिन्दी संदेश दर्ज करें।', 'Enter the Hindi message.');
    if (!messageEn.trim()) errs.messageEn = L('English संदेश दर्ज करें।', 'Enter the English message.');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await apiFetch<MarketingBannerView>('/admin/marketing/banner', {
        method: 'PATCH',
        body: JSON.stringify({
          enabled,
          messageHi: messageHi.trim(),
          messageEn: messageEn.trim(),
          ctaLabelHi: ctaLabelHi.trim() || undefined,
          ctaLabelEn: ctaLabelEn.trim() || undefined,
          ctaHref: ctaHref.trim() || undefined,
        }),
      });
      setErrors({});
      setToast(L('बैनर सहेजा गया।', 'Banner saved.'));
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-navy-900">{L('होमपेज बैनर', 'Homepage banner')}</h2>
        <label className="flex items-center gap-2 text-sm font-bold text-navy-900">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4" />
          {L('सक्रिय', 'Enabled')}
        </label>
      </div>
      <p className="mb-4 text-sm text-muted">
        {L(
          'सार्वजनिक होमपेज के सबसे ऊपर एनिमेटेड बैनर — संस्थानों को निःशुल्क ट्रायल के लिए डेमो का अनुरोध करने हेतु आमंत्रित करने के लिए उपयोगी।',
          'The animated bar at the top of the public homepage — useful for inviting institutions to request a free-trial demo.',
        )}
      </p>
      {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={L('संदेश (हिन्दी)', 'Message (Hindi)')} name="messageHi" value={messageHi} error={errors.messageHi} onChange={(e) => setMessageHi(e.target.value)} />
        <Field label={L('संदेश (English)', 'Message (English)')} name="messageEn" value={messageEn} error={errors.messageEn} onChange={(e) => setMessageEn(e.target.value)} />
        <Field label={L('CTA लेबल (हिन्दी, वैकल्पिक)', 'CTA label (Hindi, optional)')} name="ctaLabelHi" value={ctaLabelHi} error={errors.ctaLabelHi} onChange={(e) => setCtaLabelHi(e.target.value)} />
        <Field label={L('CTA लेबल (English, वैकल्पिक)', 'CTA label (English, optional)')} name="ctaLabelEn" value={ctaLabelEn} error={errors.ctaLabelEn} onChange={(e) => setCtaLabelEn(e.target.value)} />
      </div>
      <div className="mt-3">
        <Field
          label={L('CTA लिंक (वैकल्पिक)', 'CTA link (optional)')}
          name="ctaHref"
          value={ctaHref}
          error={errors.ctaHref}
          onChange={(e) => setCtaHref(e.target.value)}
          placeholder="/request-demo या mailto:support@rajyarank.com"
        />
      </div>
      <Button onClick={() => void save()} loading={busy} className="mt-4">{L('सहेजें', 'Save')}</Button>
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </section>
  );
}
