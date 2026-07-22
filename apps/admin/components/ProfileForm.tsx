'use client';
import { useState } from 'react';
import { Alert, Button, Field, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';
import type { ProfileResponse } from '@rajyarank/contracts';

export function ProfileForm({ initial, locale }: { initial: ProfileResponse; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [displayName, setDisplayName] = useState(initial.displayName ?? '');
  const [fullName, setFullName] = useState(initial.fullName ?? '');
  const [title, setTitle] = useState(initial.title ?? '');
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
        body: JSON.stringify({ displayName: displayName.trim() || undefined, fullName: fullName.trim(), title: title.trim() || undefined }),
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
    <section className="max-w-md rounded-lg border border-line bg-white p-5">
      {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
      <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label={L('पूरा नाम', 'Full name')} name="fullName" value={fullName} error={errors.fullName} onChange={(e) => setFullName(e.target.value)} />
        <Field label={L('प्रदर्शित नाम', 'Display name')} name="displayName" value={displayName} error={errors.displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <Field label={L('पदनाम (वैकल्पिक)', 'Title (optional)')} name="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="mb-4 grid gap-1 text-xs text-muted">
          <div>{L('ईमेल', 'Email')}: <span className="text-ink">{initial.email ?? '—'}</span></div>
          <div>{L('फ़ोन', 'Phone')}: <span className="text-ink">{initial.phone ?? '—'}</span></div>
          {initial.institution ? <div>{L('संस्थान', 'Institution')}: <span className="font-bold text-ink">{initial.institution.name}</span></div> : null}
          <div className="text-[11px]">{L('ईमेल/फ़ोन बदलने के लिए प्रशासक से संपर्क करें (सत्यापन आवश्यक)।', 'Contact an administrator to change email/phone (verification required).')}</div>
        </div>
        <Button type="submit" loading={busy} className="w-full">{L('सहेजें', 'Save changes')}</Button>
      </form>
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </section>
  );
}
