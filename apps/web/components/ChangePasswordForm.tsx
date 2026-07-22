'use client';
import { useState } from 'react';
import { Alert, Button, Field } from '@rajyarank/ui';
import { changePasswordSchema } from '@rajyarank/contracts';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors, validate } from '@/lib/form';

/** Changing your password revokes every session (same as the email-based
 *  reset flow) — so on success we send the student back to sign in again,
 *  rather than leaving them on a page whose session is about to die. */
export function ChangePasswordForm({ locale }: { locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  async function submit() {
    const payload = { currentPassword, newPassword };
    const errs = validate(changePasswordSchema, payload);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await apiFetch('/auth/me/password', { method: 'PATCH', body: JSON.stringify(payload) });
      setDone(true);
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="grid gap-3">
        <Alert tone="success">{L('पासवर्ड बदल दिया गया। कृपया दोबारा साइन इन करें।', 'Password changed. Please sign in again.')}</Alert>
        <a href={`/${locale}/login`} className="inline-flex min-h-[42px] items-center justify-center rounded-md bg-orange-500 px-4 text-sm font-extrabold text-white hover:bg-orange-600">
          {L('साइन इन करें', 'Sign in')}
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-md">
      {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
      <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field
          label={L('मौजूदा पासवर्ड', 'Current password')}
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          error={errors.currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <Field
          label={L('नया पासवर्ड', 'New password')}
          name="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          error={errors.newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder={L('कम से कम 10 अक्षर', 'At least 10 characters')}
        />
        <Button type="submit" loading={busy}>{L('पासवर्ड बदलें', 'Change password')}</Button>
      </form>
    </div>
  );
}

