'use client';
import { useState } from 'react';
import { Alert, Button, Field } from '@rajyarank/ui';
import { submitContactSchema, type ContactCategory } from '@rajyarank/contracts';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors, validate } from '@/lib/form';

const CATEGORIES: { value: ContactCategory; hi: string; en: string }[] = [
  { value: 'GENERAL', hi: 'सामान्य प्रश्न', en: 'General enquiry' },
  { value: 'INSTITUTION_PARTNERSHIP', hi: 'संस्थान साझेदारी', en: 'Institution partnership' },
  { value: 'STUDENT_SUPPORT', hi: 'छात्र सहायता', en: 'Student support' },
  { value: 'PRESS', hi: 'प्रेस / मीडिया', en: 'Press / media' },
  { value: 'OTHER', hi: 'अन्य', en: 'Other' },
];

export function ContactForm({ locale }: { locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<ContactCategory>('GENERAL');
  const [message, setMessage] = useState('');
  const [hp, setHp] = useState(''); // honeypot — must stay empty
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  async function submit() {
    const payload = { name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, category, message: message.trim(), hp };
    const errs = validate(submitContactSchema, payload);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await apiFetch('/contact', { method: 'POST', body: JSON.stringify(payload) });
      setDone(true);
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Alert tone="success">
        {L('धन्यवाद! आपका संदेश मिल गया है — हम जल्द ही संपर्क करेंगे।', 'Thank you! Your message has been received — we will get back to you soon.')}
      </Alert>
    );
  }

  return (
    <div>
      {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
      <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }} className="grid gap-3">
        <Field label={L('नाम', 'Name')} name="name" value={name} error={errors.name} onChange={(e) => setName(e.target.value)} />
        <Field label={L('ईमेल', 'Email')} name="email" type="email" value={email} error={errors.email} onChange={(e) => setEmail(e.target.value)} />
        <Field label={L('फ़ोन (वैकल्पिक)', 'Phone (optional)')} name="phone" value={phone} error={errors.phone} onChange={(e) => setPhone(e.target.value)} />
        <div>
          <label className="mb-1 block text-sm font-extrabold text-ink">{L('विषय', 'Topic')}</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as ContactCategory)} className="w-full rounded-md border border-line px-3 py-3 text-sm">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{hi ? c.hi : c.en}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-extrabold text-ink">{L('संदेश', 'Message')}</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-[140px] w-full rounded-md border border-line px-3 py-2 text-sm" />
          {errors.message ? <p className="mt-1 text-sm text-danger">{errors.message}</p> : null}
        </div>
        <input
          type="text"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />
        <Button type="submit" loading={busy} className="w-full sm:w-auto">{L('संदेश भेजें', 'Send message')}</Button>
      </form>
    </div>
  );
}
