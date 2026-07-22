'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Field, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';
import { roleLabel } from '@/lib/labels';

// An institution can have more than one Academic Head — an existing Head can
// invite a co-Head for their own institution (backend still blocks inviting
// SUPER_ADMIN, and always forces the invite into the actor's own org).
const ROLES = ['CONTENT_ADMIN', 'ACADEMIC_REVIEWER', 'ACADEMIC_HEAD'] as const;

/** Super Admin / Content Admin invites staff. Backend re-checks user.invite. */
export function InviteStaff({ locale = 'en' }: { locale?: string }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleKey, setRoleKey] = useState<(typeof ROLES)[number]>('CONTENT_ADMIN');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (fullName.trim().length < 2) errs.fullName = L('कृपया पूरा नाम दर्ज करें।', 'Please enter the full name.');
    if (!email.trim()) errs.email = L('कृपया कार्य ईमेल दर्ज करें।', 'Please enter the work email.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = L('कृपया मान्य ईमेल दर्ज करें।', 'Please enter a valid email address.');
    if (!/^[6-9]\d{9}$/.test(phone)) errs.phone = L('कृपया मान्य 10-अंकीय मोबाइल नंबर दर्ज करें।', 'Enter a valid 10-digit mobile number.');
    return errs;
  }

  async function submit() {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await apiFetch('/admin/staff/invitations', {
        method: 'POST',
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim(), phone, roleKey, assignments: [] }),
      });
      setToast(L('आमंत्रण भेजा गया।', 'Invitation sent.'));
      setFullName('');
      setEmail('');
      setPhone('');
      setErrors({});
      // The invited person now shows in the staff list (as INVITED, no
      // account yet) — refresh the server-rendered list to pick it up.
      router.refresh();
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-md rounded-lg border border-line bg-white p-5">
      <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('स्टाफ़ आमंत्रित करें', 'Invite staff')}</h2>
      {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
      <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label={L('पूरा नाम', 'Full name')} name="fullName" value={fullName} error={errors.fullName} onChange={(e) => setFullName(e.target.value)} />
        <Field label={L('कार्य ईमेल', 'Work email')} name="email" type="email" value={email} error={errors.email} onChange={(e) => setEmail(e.target.value)} />
        <Field
          label={L('मोबाइल नंबर', 'Mobile number')}
          name="phone"
          inputMode="numeric"
          maxLength={10}
          value={phone}
          error={errors.phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
        />
        <label className="mb-1 block text-sm font-extrabold text-ink" htmlFor="roleKey">{L('भूमिका', 'Role')}</label>
        <select
          id="roleKey"
          className="mb-4 w-full rounded-md border border-line bg-white px-3 py-3"
          value={roleKey}
          onChange={(e) => setRoleKey(e.target.value as (typeof ROLES)[number])}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>{roleLabel(r, locale === 'hi' ? 'hi' : 'en')}</option>
          ))}
        </select>
        <Button type="submit" variant="secondary" loading={busy} className="w-full">
          {L('आमंत्रण भेजें', 'Send invitation')}
        </Button>
      </form>
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </section>
  );
}
