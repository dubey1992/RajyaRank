'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Alert, Button, Field, PasswordChecklist } from '@rajyarank/ui';
import { PASSWORD_RULES, passwordResetSchema } from '@rajyarank/contracts';
import { apiFetch, type ApiError } from '@/lib/api';
import { resolveLocale } from '@/lib/i18n';
import { serverFieldErrors, validate } from '@/lib/form';

export default function ForgotPasswordPage() {
  const params = useParams<{ locale: string }>();
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  async function requestReset() {
    if (!email.trim()) return setErrors({ workEmail: L('कृपया अपना ईमेल पता दर्ज करें।', 'Please enter your email address.') });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErrors({ workEmail: L('कृपया मान्य ईमेल पता दर्ज करें।', 'Please enter a valid email address.') });
    setErrors({});
    setBusy(true);
    try {
      await apiFetch('/auth/staff/password/forgot', { method: 'POST', body: JSON.stringify({ workEmail: email }) });
      setStep('reset');
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  async function doReset() {
    const errs = validate(passwordResetSchema, { workEmail: email, code: code.trim(), password });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await apiFetch('/auth/staff/password/reset', { method: 'POST', body: JSON.stringify({ workEmail: email, code, password }) });
      setDone(true);
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="mb-1 text-2xl font-black text-navy-950">{L('पासवर्ड रीसेट करें', 'Reset your password')}</h1>
      <p className="mb-6 text-sm text-muted">
        {L('अपना कार्य ईमेल दर्ज करें — हम आपको एक रीसेट कोड भेजेंगे।', 'Enter your work email — we will send you a reset code.')}
      </p>

      {done ? (
        <div className="grid gap-4">
          <Alert tone="success">{L('आपका पासवर्ड रीसेट हो गया। अब आप नए पासवर्ड से लॉगिन कर सकते हैं।', 'Your password has been reset. You can now sign in with your new password.')}</Alert>
          <Link href={`/${locale}/admin/login`} className="text-center text-sm font-extrabold text-navy-900 hover:underline">
            {L('लॉगिन पर जाएँ', 'Go to login')}
          </Link>
        </div>
      ) : errors._form ? (
        <div className="mb-4"><Alert tone="error">{errors._form}</Alert></div>
      ) : null}

      {!done && step === 'request' ? (
        <form noValidate onSubmit={(e) => { e.preventDefault(); void requestReset(); }}>
          <Field label={L('कार्य ईमेल', 'Work email')} name="workEmail" type="email" autoComplete="username" value={email} error={errors.workEmail} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" loading={busy} className="w-full">{L('रीसेट कोड भेजें', 'Send reset code')}</Button>
        </form>
      ) : null}

      {!done && step === 'reset' ? (
        <form noValidate onSubmit={(e) => { e.preventDefault(); void doReset(); }}>
          <Alert tone="info">{L('यदि वह ईमेल मौजूद है, तो एक कोड भेजा गया है। नीचे कोड और नया पासवर्ड दर्ज करें।', 'If that email exists, a code has been sent. Enter the code and a new password below.')}</Alert>
          <div className="h-3" />
          <Field label={L('रीसेट कोड', 'Reset code')} name="code" inputMode="numeric" value={code} error={errors.code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          <Field label={L('नया पासवर्ड', 'New password')} name="password" type="password" autoComplete="new-password" value={password} error={errors.password} onChange={(e) => setPassword(e.target.value)} />
          <PasswordChecklist rules={PASSWORD_RULES.map((r) => ({ label: hi ? r.labelHi : r.labelEn, met: r.test(password) }))} />
          <Button type="submit" loading={busy} className="w-full">{L('पासवर्ड रीसेट करें', 'Reset password')}</Button>
        </form>
      ) : null}

      <Link href={`/${locale}/admin/login`} className="mt-6 text-center text-sm text-muted hover:underline">
        ← {L('लॉगिन पर वापस', 'Back to login')}
      </Link>
    </main>
  );
}
