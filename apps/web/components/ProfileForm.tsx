'use client';
import { useState } from 'react';
import { Alert, Button, Field, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';
import type { ProfileResponse } from '@rajyarank/contracts';

export function ProfileForm({ initial, locale }: { initial: ProfileResponse; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [fullName, setFullName] = useState(initial.fullName ?? '');
  const [displayName, setDisplayName] = useState(initial.displayName ?? '');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  async function submit() {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = L('कृपया अपना नाम दर्ज करें।', 'Please enter your name.');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await apiFetch('/auth/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ fullName: fullName.trim(), displayName: displayName.trim() || undefined }),
      });
      setToast(L('प्रोफ़ाइल सहेजी गई।', 'Profile saved.'));
      setErrors({});
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md">
      {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
      <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label={L('पूरा नाम', 'Full name')} name="fullName" value={fullName} error={errors.fullName} onChange={(e) => setFullName(e.target.value)} />
        <Field label={L('प्रदर्शित नाम', 'Display name')} name="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <p className="mb-4 text-xs text-muted">
          {L('फ़ोन', 'Phone')}: <span className="text-ink">{initial.phone ?? '—'}</span>
          {initial.email ? <> · {L('ईमेल', 'Email')}: <span className="text-ink">{initial.email}</span></> : null}
        </p>
        <Button type="submit" loading={busy}>{L('सहेजें', 'Save changes')}</Button>
      </form>
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </div>
  );
}
