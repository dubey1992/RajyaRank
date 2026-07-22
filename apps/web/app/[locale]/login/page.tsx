'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, Field, Logo } from '@rajyarank/ui';
import { apiFetch, API_BASE, type ApiError } from '@/lib/api';
import { resolveLocale } from '@/lib/i18n';
import { makeT } from '@/lib/t';
import { serverFieldErrors, validate } from '@/lib/form';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { studentLoginSchema, type StaffLoginResult } from '@rajyarank/contracts';

type Step = 'phone' | 'otp';
type Tab = 'student' | 'staff';
type StudentMode = 'phone' | 'email';

// Staff authenticate on the separate admin portal (its own origin + cookies).
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3001';

// Hidden per product decision (kept working, not removed) — flip to re-enable.
const SHOW_STUDENT_GOOGLE_LOGIN = false;

// "Remember me" persists only the work email (a non-secret identifier) across
// visits/logout — never the password, which stays with the browser's own
// native password manager (the form already carries the right autoComplete hints).
const REMEMBER_EMAIL_KEY = 'rr_staff_remember_email';

export default function StudentLoginPage() {
  const params = useParams<{ locale: string }>();
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const t = makeT(locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error');

  const [tab, setTab] = useState<Tab>('student');
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(0); // OTP validity countdown
  const [resendIn, setResendIn] = useState(0); // resend cooldown

  // Student email + password mode (alternative to phone OTP, same tab).
  // Email & Password is the default view (matches staff login, and is the
  // only method institute students created by their Academic Head have) —
  // phone OTP is still fully available, just one click away via the toggle
  // below, for external/self-serve students. Saves SMS cost as a side effect
  // since it's no longer the first thing anyone sees.
  const [studentMode, setStudentMode] = useState<StudentMode>('email');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentRemember, setStudentRemember] = useState(false);

  // Staff sign-in (same page). The API sets the shared rr_admin_* cookies
  // (domain = COOKIE_DOMAIN), so on success we hand off to the admin portal.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [totp, setTotp] = useState('');

  // Pre-fill the remembered work email (if any) once, on first render.
  useEffect(() => {
    const saved = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  // One ticking timer while on the OTP step; drives both countdowns.
  useEffect(() => {
    if (step !== 'otp') return;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
      setResendIn((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Localised, case-complete validation (empty vs. malformed).
  function phoneError(): string | undefined {
    if (!phone.trim()) return L('कृपया मोबाइल नंबर दर्ज करें।', 'Please enter your phone number.');
    if (!/^[6-9]\d{9}$/.test(phone)) return L('कृपया मान्य 10-अंकीय मोबाइल नंबर दर्ज करें।', 'Please enter a valid 10-digit mobile number.');
    return undefined;
  }
  function codeError(): string | undefined {
    if (!code.trim()) return L('कृपया OTP दर्ज करें।', 'Please enter the OTP.');
    if (!/^\d{6}$/.test(code)) return L('कृपया 6-अंकीय कोड दर्ज करें।', 'Please enter the 6-digit code.');
    return undefined;
  }

  // Used for both the initial send and "Resend OTP".
  async function requestOtp() {
    const err = phoneError();
    if (err) return setErrors({ phone: err });
    if (resendIn > 0) return; // cooldown guard
    setErrors({});
    setBusy(true);
    try {
      const res = await apiFetch<{ expiresInSeconds?: number }>('/auth/student/otp/request', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      setCode('');
      setSecondsLeft(res?.expiresInSeconds ?? 300);
      setResendIn(30); // throttle resends (server also rate-limits)
      setStep('otp');
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    const err = codeError();
    if (err) return setErrors({ code: err });
    setErrors({});
    setBusy(true);
    try {
      const res = await apiFetch<{ homeRoute: string }>('/auth/student/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      });
      router.push(`/${locale}${res.homeRoute}`);
    } catch (e) {
      const err2 = e as ApiError;
      // On any bad-OTP outcome, clear the field so the user re-enters cleanly.
      if (err2.code === 'AUTH_OTP_INVALID' || err2.code === 'AUTH_OTP_EXPIRED' || err2.code === 'AUTH_OTP_TOO_MANY_ATTEMPTS') {
        setCode('');
        if (err2.code === 'AUTH_OTP_EXPIRED' || err2.code === 'AUTH_OTP_TOO_MANY_ATTEMPTS') setSecondsLeft(0);
        setErrors({
          code:
            err2.code === 'AUTH_OTP_EXPIRED'
              ? L('OTP समाप्त हो गया। कृपया पुनः भेजें।', 'OTP has expired. Please resend.')
              : err2.code === 'AUTH_OTP_TOO_MANY_ATTEMPTS'
                ? L('बहुत अधिक प्रयास। कृपया नया OTP भेजें।', 'Too many attempts. Please request a new OTP.')
                : L('गलत OTP। कृपया पुनः प्रयास करें।', 'Incorrect OTP. Please try again.'),
        });
      } else {
        setErrors(serverFieldErrors(err2));
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitStudentLogin() {
    const payload = { email: studentEmail.trim(), password: studentPassword, remember: studentRemember };
    const errs = validate(studentLoginSchema, payload);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const res = await apiFetch<{ homeRoute: string }>('/auth/student/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.push(`/${locale}${res.homeRoute}`);
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  function staffLoginErrors(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.workEmail = L('कृपया ईमेल पता दर्ज करें।', 'Please enter your email address.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.workEmail = L('कृपया मान्य ईमेल पता दर्ज करें।', 'Please enter a valid email address.');
    if (!password) errs.password = L('कृपया पासवर्ड दर्ज करें।', 'Please enter your password.');
    return errs;
  }

  // After the API issues the staff session cookies, complete the sign-in on the
  // admin portal (its own origin) — cookies are shared via COOKIE_DOMAIN.
  function goToAdmin(homeRoute: string) {
    window.location.assign(`${ADMIN_URL}/${locale}${homeRoute}`);
  }

  async function submitStaffLogin() {
    const errs = staffLoginErrors();
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
      else goToAdmin(res.homeRoute);
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  async function submitStaffMfa() {
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
      goToAdmin(res.homeRoute);
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  // Reset transient form state when switching portals so errors don't bleed across tabs.
  function switchTab(next: Tab) {
    setTab(next);
    setErrors({});
    setMfaToken(null);
    setTotp('');
  }

  function switchStudentMode(next: StudentMode) {
    setStudentMode(next);
    setErrors({});
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
        <LanguageSwitch locale={locale} />
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
              {L('एक प्लेटफ़ॉर्म। छात्रों और स्टाफ़ के लिए अलग अनुभव।', 'One platform. Different experiences for students and staff.')}
            </h2>
            <p className="mt-4 max-w-xl text-[17px] text-[#d9e6f0]">
              {L('छात्र पढ़ने के लिए साइन इन करते हैं। स्टाफ़ सामग्री बनाने, समीक्षा और प्रकाशन के लिए। कोई भी लॉगिन के समय अपनी भूमिका नहीं चुनता।', 'Students sign in to learn. Staff sign in to create, review and publish. Nobody selects their own role during login.')}
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
          <h3 className="mt-2 text-2xl font-black text-navy-950 md:mt-0">{L('वापसी पर स्वागत है', 'Welcome back')}</h3>
          <p className="mb-6 mt-1 text-sm text-muted">{L('सही पोर्टल चुनें। आपकी भूमिका पहले से आपके खाते से जुड़ी है।', 'Choose the correct portal. Your account already contains your assigned role.')}</p>

          {/* Tabs */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-[14px] bg-surface-soft p-1">
            {(['student', 'staff'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => switchTab(k)}
                aria-pressed={tab === k}
                className={`rounded-xl px-3 py-2.5 text-sm font-extrabold transition ${tab === k ? 'bg-white text-navy-900 shadow-[0_4px_12px_rgba(20,36,58,0.08)]' : 'text-muted hover:text-navy-900'}`}
              >
                {k === 'student' ? t('auth.studentLogin') : t('auth.staffLogin')}
              </button>
            ))}
          </div>

          {errors._form ? <div className="mb-4"><Alert tone="error">{errors._form}</Alert></div> : null}
          {oauthError ? (
            <div className="mb-4">
              <Alert tone="error">
                {oauthError === 'google_unavailable'
                  ? L('Google साइन-इन अभी उपलब्ध नहीं है। कृपया OTP से लॉगिन करें।', 'Google sign-in is not available right now. Please log in with OTP.')
                  : L('Google साइन-इन विफल रहा। कृपया पुनः प्रयास करें।', 'Google sign-in failed. Please try again.')}
              </Alert>
            </div>
          ) : null}

          {tab === 'student' ? (
            studentMode === 'phone' ? (
              step === 'phone' ? (
                <form noValidate onSubmit={(e) => { e.preventDefault(); void requestOtp(); }}>
                  <Field
                    label={t('auth.mobileNumber')}
                    name="phone"
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    error={errors.phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    autoComplete="tel"
                    placeholder="98765 43210"
                  />
                  <Button type="submit" loading={busy} className="w-full">{t('auth.sendOtp')}</Button>

                  {SHOW_STUDENT_GOOGLE_LOGIN ? (
                    <>
                      <div className="my-4 flex items-center gap-3 text-xs text-muted">
                        <span className="h-px flex-1 bg-line" />
                        {L('या', 'or')}
                        <span className="h-px flex-1 bg-line" />
                      </div>
                      <a
                        href={`${API_BASE}/api/v1/auth/student/google/start`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm font-extrabold text-navy-900 transition hover:bg-surface-soft"
                      >
                        {L('Google से जारी रखें', 'Continue with Google')}
                      </a>
                    </>
                  ) : null}

                  <div className="mt-4 text-center text-sm">
                    <button type="button" onClick={() => switchStudentMode('email')} className="font-extrabold text-orange-600 hover:underline">
                      {L('ईमेल व पासवर्ड से साइन इन करें', 'Sign in with email & password instead')}
                    </button>
                  </div>
                  <div className="mt-4 rounded-xl bg-orange-100/60 px-3.5 py-3 text-[13px] leading-relaxed text-orange-600">
                    {t('auth.studentNotice')}
                  </div>
                </form>
              ) : (
                <form noValidate onSubmit={(e) => { e.preventDefault(); void verifyOtp(); }}>
                  <p className="mb-3 text-sm text-muted">
                    {L('OTP भेजा गया', 'OTP sent to')} <strong className="text-ink">+91 {phone}</strong>{' '}
                    <button
                      type="button"
                      onClick={() => { setStep('phone'); setCode(''); setErrors({}); setSecondsLeft(0); setResendIn(0); }}
                      className="font-extrabold text-orange-600 hover:underline"
                    >
                      {L('बदलें', 'Change')}
                    </button>
                  </p>
                  <Field
                    label={t('auth.enterOtp')}
                    name="code"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    error={errors.code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    autoFocus
                  />
                  <div className="mb-4 flex items-center justify-between text-xs">
                    <span className={secondsLeft > 0 ? 'text-muted' : 'font-extrabold text-danger'}>
                      {secondsLeft > 0
                        ? L(`OTP ${fmt(secondsLeft)} में समाप्त होगा`, `OTP expires in ${fmt(secondsLeft)}`)
                        : L('OTP समाप्त हो गया', 'OTP has expired')}
                    </span>
                    <button
                      type="button"
                      onClick={() => void requestOtp()}
                      disabled={busy || resendIn > 0}
                      className="font-extrabold text-orange-600 hover:underline disabled:text-muted disabled:no-underline"
                    >
                      {resendIn > 0
                        ? L(`${resendIn}s में पुनः भेजें`, `Resend in ${resendIn}s`)
                        : L('OTP पुनः भेजें', 'Resend OTP')}
                    </button>
                  </div>
                  <Button type="submit" loading={busy} className="w-full">{t('auth.verify')}</Button>
                </form>
              )
            ) : (
              /* Student email + password mode */
              <form noValidate onSubmit={(e) => { e.preventDefault(); void submitStudentLogin(); }}>
                <Field
                  label={L('ईमेल', 'Email')}
                  name="studentEmail"
                  type="email"
                  autoComplete="username"
                  value={studentEmail}
                  error={errors.email}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                <Field
                  label={t('auth.password')}
                  name="studentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={studentPassword}
                  error={errors.password}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <div className="mb-4 flex items-center justify-between gap-3 text-sm">
                  <label className="inline-flex cursor-pointer items-center gap-2 font-semibold text-navy-900">
                    <input
                      type="checkbox"
                      checked={studentRemember}
                      onChange={(e) => setStudentRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-line accent-orange-500"
                    />
                    {L('मुझे याद रखें', 'Remember me')}
                  </label>
                  <a href={`/${locale}/forgot-password`} className="font-bold text-orange-600 hover:underline">
                    {L('पासवर्ड भूल गए?', 'Forgot password?')}
                  </a>
                </div>
                <Button type="submit" loading={busy} className="w-full">{t('auth.signInSecurely')}</Button>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <button type="button" onClick={() => switchStudentMode('phone')} className="font-extrabold text-orange-600 hover:underline">
                    {L('मोबाइल नंबर का उपयोग करें', 'Use phone number instead')}
                  </button>
                  <a href={`/${locale}/signup`} className="font-bold text-navy-900 hover:underline">
                    {L('नया खाता बनाएँ', 'Create an account')}
                  </a>
                </div>
              </form>
            )
          ) : !mfaToken ? (
            /* Staff tab — email + password; the API issues the shared staff session. */
            <form noValidate onSubmit={(e) => { e.preventDefault(); void submitStaffLogin(); }}>
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
                <a href={`${ADMIN_URL}/${locale}/admin/forgot-password`} className="font-bold text-orange-600 hover:underline">
                  {L('पासवर्ड भूल गए?', 'Forgot password?')}
                </a>
              </div>
              <Button type="submit" loading={busy} className="w-full">{t('auth.signInSecurely')}</Button>
              <div className="mt-4 rounded-xl bg-orange-100/60 px-3.5 py-3 text-[13px] leading-relaxed text-orange-600">
                {t('auth.staffNotice')}
              </div>
            </form>
          ) : (
            /* Staff MFA step-up */
            <form noValidate onSubmit={(e) => { e.preventDefault(); void submitStaffMfa(); }}>
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
