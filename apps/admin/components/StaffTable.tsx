'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, ConfirmDialog, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { roleLabel } from '@/lib/labels';
import { SearchInput } from './SearchInput';
import type { StaffListItem } from '@rajyarank/contracts';

type Status = StaffListItem['status'];

const STATUS_TONE: Record<Status, string> = {
  ACTIVE: 'bg-teal-100 text-success',
  INVITED: 'bg-orange-100 text-warning',
  PENDING_SETUP: 'bg-orange-100 text-warning',
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

export function StaffTable({
  initial,
  locale,
  canDisable,
  canAssign,
}: {
  initial: StaffListItem[];
  locale: 'hi' | 'en';
  canDisable: boolean;
  canAssign: boolean;
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [rows, setRows] = useState<StaffListItem[]>(initial);
  // Re-sync when the server component re-fetches (e.g. InviteStaff calling
  // router.refresh() after sending a new invite) — a plain useState(initial)
  // only reads the prop once and would otherwise miss it.
  useEffect(() => setRows(initial), [initial]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  function report(e: unknown) {
    const err = e as ApiError;
    setError(
      err?.code === 'PERMISSION_DENIED'
        ? L('पहुँच अस्वीकृत — आपके पास यह क्रिया करने की अनुमति नहीं है।', 'Access denied — you do not have permission for this action.')
        : err?.code === 'AUTH_MFA_REQUIRED' || err?.code === 'MFA_REQUIRED'
          ? L('इस क्रिया के लिए MFA (AAL2) आवश्यक है।', 'This action requires MFA (AAL2).')
          : err?.message ?? L('क्रिया विफल रही।', 'Action failed.'),
    );
  }

  async function runSearch(q: string) {
    try {
      setError(null);
      const query = q ? `?search=${encodeURIComponent(q)}` : '';
      setRows(await apiFetch<StaffListItem[]>(`/admin/staff${query}`));
    } catch (e) {
      report(e);
    }
  }

  function confirmChangeStatus(id: string, status: Status) {
    setPending({
      id,
      title: L('स्थिति बदलें?', 'Change status?'),
      message: L(`इस स्टाफ़ की स्थिति "${status}" पर सेट करें।`, `Set this staff member's status to "${status}".`),
      danger: status !== 'ACTIVE',
      run: async () => {
        await apiFetch(`/admin/staff/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
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
        await apiFetch(`/admin/staff/${id}/${path}`, { method: 'POST' });
        setToast(ok);
      },
    });
  }

  function confirmResendInvite(id: string) {
    setPending({
      id,
      title: L('आमंत्रण फिर से भेजें?', 'Resend invitation?'),
      message: L('पुराना लिंक अब काम नहीं करेगा।', 'The previous link will stop working.'),
      danger: false,
      run: async () => {
        await apiFetch(`/admin/staff/invitations/${id}/resend`, { method: 'POST' });
        setToast(L('आमंत्रण फिर से भेजा गया।', 'Invitation resent.'));
      },
    });
  }

  function confirmRevokeInvite(id: string) {
    setPending({
      id,
      title: L('आमंत्रण रद्द करें?', 'Revoke invitation?'),
      message: L('यह व्यक्ति अब इस लिंक से खाता सेट नहीं कर सकेगा।', 'This person will no longer be able to set up an account with this link.'),
      danger: true,
      run: async () => {
        await apiFetch(`/admin/staff/invitations/${id}/revoke`, { method: 'POST' });
        setRows((r) => r.filter((row) => row.id !== id));
        setToast(L('आमंत्रण रद्द कर दिया गया।', 'Invitation revoked.'));
      },
    });
  }

  async function confirmRun() {
    if (!pending) return;
    setBusyId(pending.id);
    setError(null);
    try {
      await pending.run();
    } catch (e) {
      report(e);
    } finally {
      setBusyId(null);
      setPending(null);
    }
  }

  return (
    <section>
      <div className="mb-3">
        <SearchInput placeholder={L('नाम या ईमेल खोजें…', 'Search name or email…')} onSearch={(q) => void runSearch(q)} />
      </div>

      {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}

      {rows.length === 0 ? (
        <p className="text-sm text-muted">{L('कोई स्टाफ़ सदस्य नहीं मिला।', 'No staff members found.')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-soft text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">{L('नाम', 'Name')}</th>
                <th className="px-3 py-2">{L('भूमिकाएँ', 'Roles')}</th>
                <th className="px-3 py-2">{L('स्थिति', 'Status')}</th>
                <th className="px-3 py-2">{L('अंतिम लॉगिन', 'Last login')}</th>
                <th className="px-3 py-2 text-right">{L('क्रियाएँ', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((s) => (
                <tr key={s.id} className={busyId === s.id ? 'opacity-50' : ''}>
                  <td className="px-3 py-2">
                    <div className="font-bold text-ink">{s.fullName || '—'}</div>
                    <div className="text-xs text-muted">{s.email}</div>
                    {s.phone ? <div className="text-xs text-muted">{s.phone}</div> : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">{s.roleKeys.map((k) => roleLabel(k, locale)).join(', ') || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-extrabold ${STATUS_TONE[s.status]}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">
                    {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : L('कभी नहीं', 'Never')}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {s.status === 'INVITED' ? (
                        <>
                          <button
                            type="button"
                            disabled={busyId === s.id}
                            onClick={() => confirmResendInvite(s.id)}
                            className="rounded-md border border-line px-2 py-1 text-xs font-bold text-navy-900 hover:bg-surface-soft"
                          >
                            {L('फिर से भेजें', 'Resend')}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === s.id}
                            onClick={() => confirmRevokeInvite(s.id)}
                            className="rounded-md border border-line px-2 py-1 text-xs font-bold text-danger hover:bg-orange-100/50"
                          >
                            {L('रद्द करें', 'Revoke')}
                          </button>
                        </>
                      ) : (
                        <>
                          {canDisable && !s.isPrimaryHead ? (
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
                          {canAssign ? (
                            <Link
                              href={`/${locale}/admin/staff/${s.id}`}
                              className="rounded-md border border-line px-2 py-1 text-xs font-bold text-navy-900 hover:bg-surface-soft"
                            >
                              {L('असाइनमेंट', 'Assignments')}
                            </Link>
                          ) : null}
                          <button
                            type="button"
                            disabled={busyId === s.id}
                            onClick={() => confirmAction(s.id, 'force-password-reset', L('पासवर्ड रीसेट?', 'Force password reset?'), L('यह उपयोगकर्ता को पासवर्ड रीसेट के लिए बाध्य करेगा।', 'This forces the user to reset their password.'), L('पासवर्ड रीसेट ईमेल भेजा गया।', 'Password-reset email sent.'), false)}
                            className="rounded-md border border-line px-2 py-1 text-xs font-bold text-navy-900 hover:bg-surface-soft"
                          >
                            {L('पासवर्ड रीसेट', 'Reset pwd')}
                          </button>
                          {!s.isPrimaryHead ? (
                            <button
                              type="button"
                              disabled={busyId === s.id}
                              onClick={() => confirmAction(s.id, 'revoke-sessions', L('सभी सत्र रद्द करें?', 'Revoke all sessions?'), L('यह उपयोगकर्ता के सभी सक्रिय सत्र समाप्त कर देगा।', 'This signs the user out of all active sessions.'), L('सत्र रद्द कर दिए गए।', 'Sessions revoked.'), true)}
                              className="rounded-md border border-line px-2 py-1 text-xs font-bold text-danger hover:bg-orange-100/50"
                            >
                              {L('सत्र रद्द', 'Revoke')}
                            </button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
    </section>
  );
}
