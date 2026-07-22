'use client';
import { useState } from 'react';
import { Alert, Button, ConfirmDialog, Field, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';
import { SearchInput } from './SearchInput';
import type { StudentListItem } from '@rajyarank/contracts';

type Status = StudentListItem['status'];

const STATUS_TONE: Record<string, string> = {
  ACTIVE: 'bg-teal-100 text-success',
  SUSPENDED: 'bg-orange-100 text-danger',
  DISABLED: 'bg-line text-muted',
};

interface Pending {
  id: string;
  title: string;
  message: string;
  danger: boolean;
  run: () => Promise<void>;
}

export function StudentsManager({
  initial,
  locale,
  canDisable,
}: {
  initial: StudentListItem[];
  locale: 'hi' | 'en';
  canDisable: boolean;
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [rows, setRows] = useState<StudentListItem[]>(initial);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [setUpLogin, setSetUpLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  const [rowError, setRowError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  function reportRow(e: unknown) {
    const err = e as ApiError;
    setRowError(
      err?.code === 'PERMISSION_DENIED'
        ? L('पहुँच अस्वीकृत — आपके पास यह क्रिया करने की अनुमति नहीं है।', 'Access denied — you do not have permission for this action.')
        : err?.code === 'AUTH_MFA_REQUIRED' || err?.code === 'MFA_REQUIRED'
          ? L('इस क्रिया के लिए MFA (AAL2) आवश्यक है।', 'This action requires MFA (AAL2).')
          : err?.message ?? L('क्रिया विफल रही।', 'Action failed.'),
    );
  }

  async function search(q: string) {
    try {
      const query = q ? `?search=${encodeURIComponent(q)}` : '';
      setRows(await apiFetch<StudentListItem[]>(`/admin/students${query}`));
    } catch (e) {
      setToast((e as ApiError).message ?? 'Search failed');
    }
  }

  async function enroll() {
    const errs: Record<string, string> = {};
    if (fullName.trim().length < 2) errs.fullName = L('कृपया छात्र का नाम दर्ज करें।', 'Please enter the student’s name.');
    if (!/^[6-9]\d{9}$/.test(phone)) errs.phone = L('कृपया मान्य 10-अंकीय मोबाइल नंबर दर्ज करें।', 'Enter a valid 10-digit mobile number.');
    if (setUpLogin) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = L('कृपया मान्य ईमेल पता दर्ज करें।', 'Please enter a valid email address.');
      if (password.length < 10) errs.password = L('पासवर्ड कम से कम 10 अक्षर का होना चाहिए।', 'Password must be at least 10 characters.');
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const created = await apiFetch<StudentListItem>('/admin/students', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone,
          ...(setUpLogin ? { email: email.trim(), password } : {}),
        }),
      });
      setRows((r) => [created, ...r.filter((x) => x.id !== created.id)]);
      setFullName(''); setPhone(''); setEmail(''); setPassword(''); setSetUpLogin(false); setErrors({});
      setToast(
        created.reattached
          ? L(
              'यह फ़ोन नंबर पहले से एक बिना-संस्थान वाले खाते में था — अब उसे आपके संस्थान से जोड़ दिया गया है।',
              'This phone number already had an account (not linked to any institution) — it has now been linked to your institution.',
            )
          : setUpLogin
          ? L('छात्र नामांकित। वे ईमेल व पासवर्ड से लॉगिन कर सकते हैं।', 'Student enrolled. They can log in with their email & password.')
          : L('छात्र नामांकित। वे अपने फ़ोन OTP से लॉगिन कर सकते हैं।', 'Student enrolled. They can log in with their phone OTP.'),
      );
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  function confirmChangeStatus(id: string, status: Status) {
    setPending({
      id,
      title: L('स्थिति बदलें?', 'Change status?'),
      message: L(`इस छात्र की स्थिति "${status}" पर सेट करें।`, `Set this student's status to "${status}".`),
      danger: status !== 'ACTIVE',
      run: async () => {
        await apiFetch(`/admin/students/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
        setRows((r) => r.map((row) => (row.id === id ? { ...row, status } : row)));
        setToast(L('स्थिति अपडेट हो गई।', 'Status updated.'));
      },
    });
  }

  function confirmAction(id: string, path: string, title: string, message: string, ok: string, danger: boolean) {
    setPending({
      id,
      title,
      message,
      danger,
      run: async () => {
        await apiFetch(`/admin/students/${id}/${path}`, { method: 'POST' });
        setToast(ok);
      },
    });
  }

  async function confirmRun() {
    if (!pending) return;
    setBusyId(pending.id);
    setRowError(null);
    try {
      await pending.run();
    } catch (e) {
      reportRow(e);
    } finally {
      setBusyId(null);
      setPending(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section>
        <div className="mb-3">
          <SearchInput placeholder={L('नाम या फ़ोन खोजें…', 'Search name or phone…')} onSearch={(q) => void search(q)} />
        </div>
        <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('छात्र', 'Students')} ({rows.length})</h2>
        {rowError ? <div className="mb-3"><Alert tone="error">{rowError}</Alert></div> : null}
        {rows.length === 0 ? (
          <p className="text-sm text-muted">{L('अभी कोई छात्र नामांकित नहीं।', 'No students enrolled yet.')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-soft text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">{L('नाम', 'Name')}</th>
                  <th className="px-3 py-2">{L('फ़ोन', 'Phone')}</th>
                  <th className="px-3 py-2">{L('ईमेल', 'Email')}</th>
                  <th className="px-3 py-2">{L('स्थिति', 'Status')}</th>
                  <th className="px-3 py-2">{L('अंतिम लॉगिन', 'Last login')}</th>
                  <th className="px-3 py-2 text-right">{L('क्रियाएँ', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((s) => (
                  <tr key={s.id} className={busyId === s.id ? 'opacity-50' : ''}>
                    <td className="px-3 py-2 font-bold text-ink">{s.fullName || '—'}</td>
                    <td className="px-3 py-2 text-muted">{s.phone}</td>
                    <td className="px-3 py-2 text-muted">{s.email ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-extrabold ${STATUS_TONE[s.status] ?? 'bg-line text-muted'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">{s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : L('कभी नहीं', 'Never')}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {canDisable ? (
                          <select
                            aria-label={L('स्थिति बदलें', 'Change status')}
                            value={s.status}
                            disabled={busyId === s.id}
                            onChange={(e) => confirmChangeStatus(s.id, e.target.value as Status)}
                            className="rounded-md border border-line px-1 py-1 text-xs"
                          >
                            {(['ACTIVE', 'SUSPENDED', 'DISABLED'] as const).map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        ) : null}
                        {s.email ? (
                          <button
                            type="button"
                            disabled={busyId === s.id}
                            onClick={() => confirmAction(s.id, 'force-password-reset', L('पासवर्ड रीसेट?', 'Force password reset?'), L('यह छात्र को पासवर्ड रीसेट के लिए बाध्य करेगा।', 'This forces the student to reset their password.'), L('पासवर्ड रीसेट ईमेल भेजा गया।', 'Password-reset email sent.'), false)}
                            className="rounded-md border border-line px-2 py-1 text-xs font-bold text-navy-900 hover:bg-surface-soft"
                          >
                            {L('पासवर्ड रीसेट', 'Reset pwd')}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={busyId === s.id}
                          onClick={() => confirmAction(s.id, 'revoke-sessions', L('सभी सत्र रद्द करें?', 'Revoke all sessions?'), L('यह छात्र के सभी सक्रिय सत्र समाप्त कर देगा।', 'This signs the student out of all active sessions.'), L('सत्र रद्द कर दिए गए।', 'Sessions revoked.'), true)}
                          className="rounded-md border border-line px-2 py-1 text-xs font-bold text-danger hover:bg-orange-100/50"
                        >
                          {L('सत्र रद्द', 'Revoke')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-1 text-lg font-extrabold text-navy-900">{L('छात्र नामांकित करें', 'Enroll student')}</h2>
        <p className="mb-3 text-xs text-muted">{L('छात्र फ़ोन OTP से लॉगिन करेगा, या नीचे ईमेल व पासवर्ड सेट करें ताकि वे सीधे उससे लॉगिन कर सकें।', 'The student can log in with phone OTP, or set up email & password below so they can sign in directly with that instead.')}</p>
        {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
        <form noValidate onSubmit={(e) => { e.preventDefault(); void enroll(); }}>
          <Field label={L('पूरा नाम', 'Full name')} name="fullName" value={fullName} error={errors.fullName} onChange={(e) => setFullName(e.target.value)} />
          <Field label={L('मोबाइल नंबर', 'Mobile number')} name="phone" inputMode="numeric" maxLength={10} value={phone} error={errors.phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />

          <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm font-bold text-ink">
            <input type="checkbox" checked={setUpLogin} onChange={(e) => setSetUpLogin(e.target.checked)} className="h-4 w-4 rounded border-line accent-orange-500" />
            {L('अभी ईमेल व पासवर्ड लॉगिन सेट करें', 'Set up email & password login now')}
          </label>

          {setUpLogin ? (
            <>
              <Field label={L('ईमेल', 'Email')} name="email" type="email" value={email} error={errors.email} onChange={(e) => setEmail(e.target.value)} placeholder="student@example.com" />
              <Field
                label={L('पासवर्ड सेट करें', 'Set a password')}
                name="password"
                type="text"
                value={password}
                error={errors.password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={L('कम से कम 10 अक्षर — छात्र को बताएँ', 'At least 10 characters — share this with the student')}
              />
            </>
          ) : null}

          <Button type="submit" loading={busy} className="w-full">{L('नामांकित करें', 'Enroll student')}</Button>
        </form>
      </section>

      <ConfirmDialog
        open={!!pending}
        title={pending?.title ?? ''}
        message={pending?.message}
        confirmLabel={L('पुष्टि करें', 'Confirm')}
        cancelLabel={L('रद्द करें', 'Cancel')}
        tone={pending?.danger ? 'danger' : 'default'}
        busy={!!busyId}
        onConfirm={() => void confirmRun()}
        onCancel={() => setPending(null)}
      />
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </div>
  );
}
