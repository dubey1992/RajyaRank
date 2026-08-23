'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Field, Toast } from '@rajyarank/ui';
import { requestPhoneChangeSchema, confirmPhoneChangeSchema } from '@rajyarank/contracts';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors, validate } from '@/lib/form';

/** Two-step, OTP-verified phone number change — mirrors the request/verify
 *  shape of student OTP login, since the phone number IS the login identity
 *  for OTP sign-in: a bare text-field update would let anyone type in
 *  someone else's real number and receive that person's future login codes. */
export function ChangePhoneForm({ currentPhone, locale }: { currentPhone: string | null; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [savedPhone, setSavedPhone] = useState(currentPhone);

  async function requestOtp() {
    const errs = validate(requestPhoneChangeSchema, { phone: phone.trim() });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await apiFetch('/auth/me/phone/request-otp', { method: 'POST', body: JSON.stringify({ phone: phone.trim() }) });
      setStep('code');
      setErrors({});
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  async function confirmOtp() {
    const errs = validate(confirmPhoneChangeSchema, { phone: phone.trim(), code: code.trim() });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await apiFetch('/auth/me/phone/confirm', { method: 'POST', body: JSON.stringify({ phone: phone.trim(), code: code.trim() }) });
      setSavedPhone(phone.trim());
      setToast(L('फ़ोन नंबर अपडेट किया गया।', 'Phone number updated.'));
      setStep('phone');
      setPhone('');
      setCode('');
      setErrors({});
      router.refresh(); // re-fetches the server-rendered profile (ProfileForm's static phone line)
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md">
      <p className="mb-3 text-xs text-muted">
        {L('मौजूदा फ़ोन', 'Current phone')}: <span className="text-ink">{savedPhone ?? '—'}</span>
      </p>
      {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
      {step === 'phone' ? (
        <form noValidate onSubmit={(e) => { e.preventDefault(); void requestOtp(); }}>
          <Field
            label={L('नया फ़ोन नंबर', 'New phone number')}
            name="phone"
            type="tel"
            value={phone}
            error={errors.phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Button type="submit" loading={busy}>{L('OTP भेजें', 'Send OTP')}</Button>
        </form>
      ) : (
        <form noValidate onSubmit={(e) => { e.preventDefault(); void confirmOtp(); }}>
          <p className="mb-3 text-sm text-muted">
            {L(`${phone} पर भेजा गया 6-अंकों का कोड दर्ज करें।`, `Enter the 6-digit code sent to ${phone}.`)}
          </p>
          <Field
            label={L('OTP कोड', 'OTP code')}
            name="code"
            inputMode="numeric"
            value={code}
            error={errors.code}
            onChange={(e) => setCode(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={busy}>{L('पुष्टि करें', 'Confirm')}</Button>
            <button
              type="button"
              onClick={() => { setStep('phone'); setCode(''); setErrors({}); }}
              className="rounded-md border border-line px-4 py-2 text-sm font-extrabold text-ink hover:bg-surface-soft"
            >
              {L('रद्द करें', 'Cancel')}
            </button>
          </div>
        </form>
      )}
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </div>
  );
}
