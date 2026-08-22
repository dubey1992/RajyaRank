'use client';
import { useState } from 'react';
import { apiFetch, type ApiError } from '@/lib/api';
import type { DemoRequestView } from '@rajyarank/contracts';
import { formatLeadSource } from '@/lib/leadSource';

export function DemoRequestsManager({ initial, locale }: { initial: DemoRequestView[]; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [rows, setRows] = useState<DemoRequestView[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resolve(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await apiFetch<DemoRequestView>(`/staff/demo-requests/${id}/resolve`, { method: 'PATCH' });
      setRows((r) => r.map((x) => (x.id === id ? updated : x)));
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted">{L('अभी कोई डेमो अनुरोध नहीं है।', 'No demo requests yet.')}</p>;
  }

  return (
    <div className="grid gap-3">
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {rows.map((r) => (
        <div key={r.id} className="rounded-lg border border-line bg-white p-4">
          <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
            <div>
              <strong className="text-navy-900">{r.institutionName}</strong>
              <span className="ml-2 text-xs text-muted">
                {r.contactName}{r.role ? `, ${r.role}` : ''} · {r.email} · {r.phone}
              </span>
              {r.city || r.studentCount ? (
                <div className="mt-0.5 text-xs font-bold text-orange-600">
                  {[r.city, r.studentCount ? L(`~${r.studentCount} छात्र`, `~${r.studentCount} students`) : null].filter(Boolean).join(' · ')}
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${r.status === 'RESOLVED' ? 'bg-teal-100 text-success' : 'bg-orange-100 text-orange-600'}`}>
                {r.status === 'RESOLVED' ? L('हल हो गया', 'Resolved') : L('नया', 'New')}
              </span>
              {r.status !== 'RESOLVED' ? (
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void resolve(r.id)}
                  className="rounded-md border border-line px-2 py-1 text-xs font-bold hover:bg-surface-soft disabled:opacity-50"
                >
                  {L('हल के रूप में चिह्नित करें', 'Mark resolved')}
                </button>
              ) : null}
            </div>
          </div>
          {r.message ? <p className="whitespace-pre-wrap text-sm text-ink">{r.message}</p> : null}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span className="rounded-full bg-surface-soft px-2 py-0.5 font-bold text-navy-700">{formatLeadSource(r, hi)}</span>
            <span>{new Date(r.createdAt).toLocaleString(hi ? 'hi-IN' : 'en-IN')}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
