'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Alert, Button, Field } from '@rajyarank/ui';
import { studentSignupVerifySchema } from '@rajyarank/contracts';
import { apiFetch, type ApiError } from '@/lib/api';
import { resolveLocale } from '@/lib/i18n';
import { serverFieldErrors, validate } from '@/lib/form';

type Step = 'email' | 'verify';

export default function SignupPage() {
  const params = useParams<{ locale: string }>();
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const router = useRouter();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function emailError(): string | undefined {
    if (!email.trim()) return L('कृपया अपना ईमेल दर्ज करें।', 'Please enter your email address.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return L('कृपया मान्य ईमेल पता दर्ज करें।', 'Please enter a valid email address.');
    return undefined;
  }

  async function submitEmail() {
    const err = emailError();
    if (err) return setErrors({ email: err });
    setErrors({});
    setBusy(true);
    try {
      await apiFetch('/auth/student/signup/request', { method: 'POST', body: JSON.stringify({ email: email.trim() }) });
      setStep('verify');
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  async function submitVerify() {
    const payload = { email: email.trim(), code: code.trim(), password };
    const errs = validate(studentSignupVerifySchema, payload);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const res = await apiFetch<{ homeRoute: string }>('/auth/student/signup/verify', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.refresh();
      router.push(`/${locale}${res.homeRoute}`);
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <h1 className="mb-1 text-2xl font-black text-navy-950">{L('खाता बनाएँ', 'Create your account')}</h1>
      <p className="mb-6 text-sm text-muted">
        {step === 'email'
          ? L('शुरू करने के लिए अपना ईमेल दर्ज करें।', 'Enter your email to get started.')
          : L('अपना ईमेल सत्यापित करें और पासवर्ड सेट करें।', 'Verify your email and set a password.')}
      </p>

      {errors._form ? <div className="mb-4"><Alert tone="error">{errors._form}</Alert></div> : null}

      {step === 'email' ? (
        <form noValidate onSubmit={(e) => { e.preventDefault(); void submitEmail(); }}>
          <Field
            label={L('ईमेल', 'Email')}
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            error={errors.email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <Button type="submit" loading={busy} className="w-full">{L('कोड भेजें', 'Send verification code')}</Button>
        </form>
      ) : (
        <form noValidate onSubmit={(e) => { e.preventDefault(); void submitVerify(); }}>
          <p className="mb-3 text-sm text-muted">
            {L('कोड भेजा गया', 'Code sent to')} <strong className="text-ink">{email}</strong>{' '}
            <button type="button" onClick={() => { setStep('email'); setCode(''); setErrors({}); }} className="font-extrabold text-orange-600 hover:underline">
              {L('बदलें', 'Change')}
            </button>
          </p>
          <Field
            label={L('सत्यापन कोड', 'Verification code')}
            name="code"
            inputMode="numeric"
            maxLength={6}
            value={code}
            error={errors.code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            autoFocus
          />
          <Field
            label={L('पासवर्ड सेट करें', 'Set a password')}
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            error={errors.password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={L('कम से कम 10 अक्षर', 'At least 10 characters')}
          />
          <Button type="submit" loading={busy} className="w-full">{L('खाता बनाएँ', 'Create account')}</Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        {L('पहले से खाता है?', 'Already have an account?')}{' '}
        <a href={`/${locale}/login`} className="font-extrabold text-orange-600 hover:underline">{L('साइन इन करें', 'Sign in')}</a>
      </p>
    </main>
  );
}
