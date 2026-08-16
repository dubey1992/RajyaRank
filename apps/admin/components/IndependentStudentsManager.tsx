'use client';
import { useState } from 'react';
import { Alert } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { SearchInput } from './SearchInput';
import type { IndependentStudentListItem } from '@rajyarank/contracts';

const STATUS_TONE: Record<string, string> = {
  ACTIVE: 'bg-teal-100 text-success',
  SUSPENDED: 'bg-orange-100 text-danger',
  DISABLED: 'bg-line text-muted',
};

function fmtDate(iso: string, hi: boolean): string {
  return new Date(iso).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function IndependentStudentsManager({
  initial,
  locale,
}: {
  initial: IndependentStudentListItem[];
  locale: 'hi' | 'en';
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  const [rows, setRows] = useState<IndependentStudentListItem[]>(initial);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function reload(next: { search?: string; from?: string; to?: string }) {
    const s = next.search ?? search;
    const f = next.from ?? from;
    const t = next.to ?? to;
    const params = new URLSearchParams();
    if (s) params.set('search', s);
    if (f) params.set('from', f);
    if (t) params.set('to', t);
    const qs = params.toString();
    try {
      setRows(await apiFetch<IndependentStudentListItem[]>(`/admin/students/independent${qs ? `?${qs}` : ''}`));
    } catch (e) {
      setError((e as ApiError).message ?? L('लोड नहीं हो सका।', 'Could not load.'));
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full max-w-sm">
          <SearchInput
            placeholder={L('नाम, ईमेल या फ़ोन खोजें…', 'Search name, email, or phone…')}
            onSearch={(q) => { setSearch(q); void reload({ search: q }); }}
          />
        </div>
        <label className="grid gap-1 text-xs font-bold text-muted">
          {L('से', 'From')}
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); void reload({ from: e.target.value }); }}
            className="rounded-md border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-orange-500"
          />
        </label>
        <label className="grid gap-1 text-xs font-bold text-muted">
          {L('तक', 'To')}
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); void reload({ to: e.target.value }); }}
            className="rounded-md border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-orange-500"
          />
        </label>
        {from || to || search ? (
          <button
            type="button"
            onClick={() => { setSearch(''); setFrom(''); setTo(''); void reload({ search: '', from: '', to: '' }); }}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-soft"
          >
            {L('फ़िल्टर साफ़ करें', 'Clear filters')}
          </button>
        ) : null}
      </div>

      <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('स्वतंत्र छात्र', 'Independent students')} ({rows.length})</h2>
      {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}

      {rows.length === 0 ? (
        <p className="text-sm text-muted">{L('कोई रिकॉर्ड नहीं मिला।', 'No records found.')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-soft text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">{L('नाम', 'Name')}</th>
                <th className="px-3 py-2">{L('ईमेल', 'Email')}</th>
                <th className="px-3 py-2">{L('फ़ोन', 'Phone')}</th>
                <th className="px-3 py-2">{L('स्थिति', 'Status')}</th>
                <th className="px-3 py-2">{L('साइन अप', 'Signed up')}</th>
                <th className="px-3 py-2">{L('अंतिम लॉगिन', 'Last login')}</th>
                <th className="px-3 py-2">{L('रेफ़र किया', 'Referred by')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 font-bold text-ink">{s.fullName || '—'}</td>
                  <td className="px-3 py-2 text-muted">{s.email ?? '—'}</td>
                  <td className="px-3 py-2 text-muted">{s.phone || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-extrabold ${STATUS_TONE[s.status] ?? 'bg-line text-muted'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">{fmtDate(s.createdAt, hi)}</td>
                  <td className="px-3 py-2 text-xs text-muted">{s.lastLoginAt ? fmtDate(s.lastLoginAt, hi) : L('कभी नहीं', 'Never')}</td>
                  <td className="px-3 py-2 text-xs text-muted">{s.referredByOrgName ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
