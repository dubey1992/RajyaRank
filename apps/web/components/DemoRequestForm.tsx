'use client';
import { useState } from 'react';
import { Alert, Button, Field } from '@rajyarank/ui';
import { submitDemoRequestSchema } from '@rajyarank/contracts';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors, validate } from '@/lib/form';
import { trackEvent } from '@/lib/analytics';
import { getStoredAttribution } from '@/lib/attribution';

export function DemoRequestForm({ locale }: { locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [institutionName, setInstitutionName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [city, setCity] = useState('');
  const [studentCount, setStudentCount] = useState('');
  const [message, setMessage] = useState('');
  const [hp, setHp] = useState(''); // honeypot — must stay empty
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  async function submit() {
    const payload = {
      institutionName: institutionName.trim(),
      contactName: contactName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      role: role.trim() || undefined,
      city: city.trim() || undefined,
      studentCount: studentCount.trim() || undefined,
      message: message.trim() || undefined,
      ...getStoredAttribution(),
      hp,
    };
    const errs = validate(submitDemoRequestSchema, payload);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await apiFetch('/demo-requests', { method: 'POST', body: JSON.stringify(payload) });
      // GA4 conversion event — deliberately no institutionName/email/phone/message
      // in params (PII), just enough to see which channel produces real leads.
      trackEvent('generate_lead', { method: 'request_demo_form', has_student_count: Boolean(studentCount.trim()) });
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
        {L(
          'धन्यवाद! आपका अनुरोध मिल गया है — हमारी टीम जल्द ही डेमो शेड्यूल करने के लिए संपर्क करेगी।',
          'Thank you! Your request has been received — our team will reach out soon to schedule a demo.',
        )}
      </Alert>
    );
  }

  return (
    <div>
      {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
      <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }} className="grid gap-3">
        <Field label={L('संस्थान का नाम', 'Institution name')} name="institutionName" value={institutionName} error={errors.institutionName} onChange={(e) => setInstitutionName(e.target.value)} />
        <Field label={L('संपर्क व्यक्ति का नाम', 'Contact person name')} name="contactName" value={contactName} error={errors.contactName} onChange={(e) => setContactName(e.target.value)} />
        <Field label={L('ईमेल', 'Email')} name="email" type="email" value={email} error={errors.email} onChange={(e) => setEmail(e.target.value)} />
        <Field label={L('फ़ोन', 'Phone')} name="phone" value={phone} error={errors.phone} onChange={(e) => setPhone(e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={L('पद (वैकल्पिक)', 'Role (optional)')} name="role" value={role} error={errors.role} onChange={(e) => setRole(e.target.value)} />
          <Field label={L('शहर (वैकल्पिक)', 'City (optional)')} name="city" value={city} error={errors.city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <Field label={L('अनुमानित छात्र संख्या (वैकल्पिक)', 'Approx. student count (optional)')} name="studentCount" type="number" value={studentCount} error={errors.studentCount} onChange={(e) => setStudentCount(e.target.value)} />
        <div>
          <label className="mb-1 block text-sm font-extrabold text-ink">{L('संदेश (वैकल्पिक)', 'Message (optional)')}</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-[100px] w-full rounded-md border border-line px-3 py-2 text-sm" />
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
        <Button type="submit" loading={busy} className="w-full sm:w-auto">{L('डेमो का अनुरोध करें', 'Request a demo')}</Button>
      </form>
    </div>
  );
}
