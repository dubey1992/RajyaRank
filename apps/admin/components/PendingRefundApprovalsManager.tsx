'use client';
import { useState } from 'react';
import { Alert, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import type { PendingRefundView } from '@rajyarank/contracts';

function rupees(minor: number) {
  return `₹${(minor / 100).toLocaleString('en-IN')}`;
}

/** Super Admin's approval queue — Academic Head requests above the
 *  auto-approval ceiling, or on already-settled orders, land here. */
export function PendingRefundApprovalsManager({ initial, locale }: { initial: PendingRefundView[]; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [rows, setRows] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [orgFilter, setOrgFilter] = useState('');

  const institutes = [...new Map(rows.filter((r) => r.orgId).map((r) => [r.orgId as string, r.orgName as string])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1]));
  const visibleRows = orgFilter ? rows.filter((r) => (orgFilter === '__none__' ? !r.orgId : r.orgId === orgFilter)) : rows;

  async function approve(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/admin/refunds/${id}/approve`, { method: 'POST' });
      setRows((r) => r.filter((x) => x.id !== id));
      setToast(L('धनवापसी स्वीकृत व संसाधित की गई।', 'Refund approved and processed.'));
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/admin/refunds/${id}/reject`, { method: 'POST', body: JSON.stringify({}) });
      setRows((r) => r.filter((x) => x.id !== id));
      setToast(L('धनवापसी अस्वीकृत की गई।', 'Refund rejected.'));
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold text-navy-900">{L('स्वीकृति हेतु लंबित धनवापसी', 'Pending refund approvals')} ({visibleRows.length})</h2>
        {institutes.length ? (
          <select
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            aria-label={L('संस्थान से फ़िल्टर करें', 'Filter by institute')}
            className="rounded-md border border-line px-2 py-1.5 text-xs font-bold"
          >
            <option value="">{L('सभी संस्थान', 'All institutes')}</option>
            {institutes.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            <option value="__none__">{L('कोई संस्थान नहीं', 'No institute')}</option>
          </select>
        ) : null}
      </div>
      <p className="mb-3 text-xs text-muted">
        {L('ये अनुरोध सीमा से ऊपर हैं या पहले से निपटाए जा चुके ऑर्डर पर हैं — दोनों को Super Admin की स्वीकृति चाहिए।', 'These requests are above the auto-approval ceiling, or on an already-settled order — both require Super Admin sign-off.')}
      </p>
      {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}
      {visibleRows.length === 0 ? (
        <p className="text-sm text-muted">{rows.length === 0 ? L('अभी कोई अनुरोध लंबित नहीं।', 'No requests pending.') : L('इस संस्थान के लिए कोई लंबित अनुरोध नहीं।', 'No pending requests for this institute.')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-soft text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">{L('छात्र', 'Student')}</th>
                <th className="px-3 py-2">{L('संस्थान', 'Institute')}</th>
                <th className="px-3 py-2">{L('उत्पाद', 'Product')}</th>
                <th className="px-3 py-2">{L('राशि', 'Amount')}</th>
                <th className="px-3 py-2">{L('कारण', 'Reason')}</th>
                <th className="px-3 py-2 text-right">{L('कार्रवाई', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visibleRows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 font-bold text-ink">{r.buyer}</td>
                  <td className="px-3 py-2 text-muted">{r.orgName ?? L('—', '—')}</td>
                  <td className="px-3 py-2">{r.productTitle}</td>
                  <td className="px-3 py-2">{rupees(r.amountMinor)}</td>
                  <td className="px-3 py-2 text-muted">{r.reason ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button type="button" disabled={busyId === r.id} className="rounded-md bg-teal-600 px-2 py-1 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50" onClick={() => void approve(r.id)}>
                        {L('स्वीकृत करें', 'Approve')}
                      </button>
                      <button type="button" disabled={busyId === r.id} className="rounded-md border border-line px-2 py-1 text-xs font-bold hover:bg-surface-soft disabled:opacity-50" onClick={() => void reject(r.id)}>
                        {L('अस्वीकार करें', 'Reject')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </section>
  );
}
