'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Alert, Button, Field, Logo } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { resolveLocale } from '@/lib/i18n';
import { makeT } from '@/lib/t';
import type { StaffLoginResult } from '@rajyarank/contracts';
import { serverFieldErrors } from '@/lib/form';
import { AdminLangSwitch } from '@/components/AdminLangSwitch';

// "Remember me" persists only the work email (a non-secret identifier) across
// visits/logout — never the password. Passwords are left to the browser's own
// native password manager (the form already carries the right autoComplete
// hints for that); storing a password in localStorage would be readable by
// any injected script, which is not an acceptable risk for a staff/admin login.
const REMEMBER_EMAIL_KEY = 'rr_admin_remember_email';

export default function StaffLoginPage() {
  const params = useParams<{ locale: string }>();
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const t = makeT(locale);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);

  // Pre-fill the remembered email (if any) once, on first render.
  useEffect(() => {
    const saved = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [totp, setTotp] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function loginErrors(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.workEmail = L('कृपया ईमेल पता दर्ज करें।', 'Please enter your email address.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.workEmail = L('कृपया मान्य ईमेल पता दर्ज करें।', 'Please enter a valid email address.');
    if (!password) errs.password = L('कृपया पासवर्ड दर्ज करें।', 'Please enter your password.');
    return errs;
  }

  async function submitLogin() {
    const errs = loginErrors();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const res = await apiFetch<StaffLoginResult>('/auth/staff/login', {
        method: 'POST',
        body: JSON.stringify({ workEmail: email, password, remember }),
      });
      // Credentials verified — persist (or clear) the remembered email now.
      if (remember) window.localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
      else window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
      if (res.status === 'MFA_REQUIRED') setMfaToken(res.mfaToken);
      else router.push(`/${locale}${res.homeRoute}`);
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  async function submitMfa() {
    if (!mfaToken) return;
    if (!totp.trim()) return setErrors({ totp: L('कृपया प्रमाणीकरण कोड दर्ज करें।', 'Please enter the authenticator code.') });
    if (!/^\d{6}$/.test(totp)) return setErrors({ totp: L('कृपया 6-अंकीय कोड दर्ज करें।', 'Please enter the 6-digit code.') });
    setErrors({});
    setBusy(true);
    try {
      const res = await apiFetch<{ homeRoute: string }>('/auth/staff/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ mfaToken, totp }),
      });
      router.push(`/${locale}${res.homeRoute}`);
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  const heroPoints = [
    { h: L('भूमिकाएँ सुपर एडमिन द्वारा तय', 'Roles assigned by Super Admin'), p: L('शिक्षक, समीक्षक, कंटेंट एडमिन और सपोर्ट भूमिकाएँ लॉगिन से पहले दी जाती हैं।', 'Teacher, Reviewer, Content Admin and Support roles are assigned before login.') },
    { h: L('कोर्स-स्तर की अनुमतियाँ', 'Course-level permissions'), p: L('शिक्षक केवल असाइन किए गए कोर्स, विषय और अपने ड्राफ्ट देख सकते हैं।', 'A teacher only accesses assigned courses, subjects and their own drafts.') },
    { h: L('सर्वर-साइड सुरक्षा', 'Server-side protection'), p: L('बैकएंड हर सुरक्षित कार्रवाई की जाँच करता है, भले ही API सीधे कॉल की जाए।', 'The backend verifies every protected action, even when an API is called directly.') },
  ];

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        background:
          'radial-gradient(circle at 90% 0, rgba(249,115,22,0.08), transparent 28%), radial-gradient(circle at 0 100%, rgba(15,139,120,0.08), transparent 32%), #f6f9fb',
      }}
    >
      {/* Topbar */}
      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-line bg-white/95 px-5 backdrop-blur-xl sm:px-7">
        <Logo size={40} />
        <AdminLangSwitch locale={locale} />
      </header>

      <main id="main" className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 px-4 py-8 md:grid-cols-[1.05fr_0.95fr] md:py-10">
        {/* Hero panel */}
        <section className="relative hidden overflow-hidden rounded-[28px] bg-gradient-to-br from-navy-900 to-navy-950 p-8 text-white shadow-[0_16px_42px_rgba(20,36,58,0.1)] md:block md:p-10">
          <span aria-hidden className="pointer-events-none absolute -right-24 -top-20 h-64 w-64 rounded-full bg-white/[0.08]" />
          <span aria-hidden className="pointer-events-none absolute -bottom-24 -left-20 h-44 w-44 rounded-full bg-orange-500/20" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider">
              {L('सुरक्षित, भूमिका-आधारित प्रवेश', 'Secure, role-based access')}
            </span>
            <h2 className="mt-5 max-w-xl text-4xl font-black leading-[1.05] md:text-5xl">
              {L('स्टाफ़ पोर्टल — बनाएँ, समीक्षा करें और प्रकाशित करें।', 'Staff portal — create, review and publish.')}
            </h2>
            <p className="mt-4 max-w-xl text-[17px] text-[#d9e6f0]">
              {L('कोई भी लॉगिन के समय अपनी भूमिका नहीं चुनता। प्रमाणीकरण के बाद बैकएंड आपकी सौंपी गई भूमिका और अनुमतियाँ लोड करता है।', 'Nobody selects their own role during login. After authentication the backend loads your assigned role and permissions.')}
            </p>
            <div className="mt-8 grid gap-3.5">
              {heroPoints.map((pt) => (
                <div key={pt.h} className="flex items-start gap-3">
                  <span className="grid h-8 w-8 flex-none place-items-center rounded-[10px] bg-white/10 text-teal-100">✓</span>
                  <div>
                    <b className="block">{pt.h}</b>
                    <span className="mt-0.5 block text-sm text-[#c8dae8]">{pt.p}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Auth card */}
        <section className="rounded-[28px] border border-line bg-white p-6 shadow-[0_16px_42px_rgba(20,36,58,0.1)] sm:p-7">
          <div className="mb-1 md:hidden">
            <Logo size={34} />
          </div>
          <h3 className="mt-2 text-2xl font-black text-navy-950 md:mt-0">{t('auth.staffLogin')}</h3>
          <p className="mb-6 mt-1 text-sm text-muted">{t('auth.staffNotice')}</p>

          {errors._form ? <div className="mb-4"><Alert tone="error">{errors._form}</Alert></div> : null}

          {!mfaToken ? (
            <form noValidate onSubmit={(e) => { e.preventDefault(); void submitLogin(); }}>
              <Field
                label={t('auth.workEmail')}
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                error={errors.workEmail}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@rajyarank.in"
              />
              <Field
                label={t('auth.password')}
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                error={errors.password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <div className="mb-4 flex items-center justify-between gap-3 text-sm">
                <label className="inline-flex cursor-pointer items-center gap-2 font-semibold text-navy-900">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-line accent-orange-500"
                  />
                  {L('मुझे याद रखें', 'Remember me')}
                </label>
                <Link href={`/${locale}/admin/forgot-password`} className="font-bold text-orange-600 hover:underline">
                  {L('पासवर्ड भूल गए?', 'Forgot password?')}
                </Link>
              </div>
              <Button type="submit" loading={busy} className="w-full">{t('auth.signInSecurely')}</Button>
            </form>
          ) : (
            <form noValidate onSubmit={(e) => { e.preventDefault(); void submitMfa(); }}>
              <h4 className="mb-2 text-lg font-extrabold text-navy-900">{t('auth.mfaTitle')}</h4>
              <p className="mb-4 text-sm text-muted">{t('auth.mfaPrompt')}</p>
              <Field
                label={t('auth.mfaTitle')}
                name="totp"
                inputMode="numeric"
                maxLength={6}
                value={totp}
                error={errors.totp}
                onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoFocus
              />
              <Button type="submit" loading={busy} className="w-full">{t('auth.verify')}</Button>
              <div className="mt-3 text-center">
                <button type="button" onClick={() => { setMfaToken(null); setTotp(''); setErrors({}); }} className="text-sm font-bold text-navy-900 hover:underline">
                  {L('वापस जाएँ', 'Back')}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
