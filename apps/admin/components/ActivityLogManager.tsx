'use client';
import { useEffect, useState } from 'react';
import { Alert } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { auditLabel, resultLabel } from '@/lib/labels';
import { SearchInput } from './SearchInput';
import type { AuditEvent, AuditEventsResponse, AuditSummary, OrganizationView } from '@rajyarank/contracts';

const ACTION_CATEGORIES: { value: string; hi: string; en: string }[] = [
  { value: '', hi: 'सभी कार्रवाइयाँ', en: 'All actions' },
  { value: 'auth.', hi: 'लॉगिन व प्रमाणीकरण', en: 'Login & auth' },
  { value: 'payment.', hi: 'भुगतान', en: 'Payments' },
  { value: 'order.', hi: 'ऑर्डर', en: 'Orders' },
  { value: 'content.', hi: 'कंटेंट', en: 'Content' },
  { value: 'staff.', hi: 'स्टाफ़', en: 'Staff' },
  { value: 'student.', hi: 'छात्र', en: 'Students' },
  { value: 'support.', hi: 'सहायता', en: 'Support' },
];

const DATE_PRESETS: { value: string; hours: number | null; hi: string; en: string }[] = [
  { value: '24h', hours: 24, hi: 'पिछले 24 घंटे', en: 'Last 24 hours' },
  { value: '7d', hours: 24 * 7, hi: 'पिछले 7 दिन', en: 'Last 7 days' },
  { value: '30d', hours: 24 * 30, hi: 'पिछले 30 दिन', en: 'Last 30 days' },
  { value: 'all', hours: null, hi: 'हर समय', en: 'All time' },
];

const PAGE_SIZE = 100;

export function ActivityLogManager({ locale }: { locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  const [orgs, setOrgs] = useState<OrganizationView[]>([]);
  const [orgId, setOrgId] = useState('');
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');
  const [datePreset, setDatePreset] = useState('7d');
  const [actorQuery, setActorQuery] = useState('');

  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<OrganizationView[]>('/admin/organizations').then(setOrgs).catch(() => {});
  }, []);

  function dateFrom(): string | undefined {
    const preset = DATE_PRESETS.find((p) => p.value === datePreset);
    if (!preset?.hours) return undefined;
    return new Date(Date.now() - preset.hours * 60 * 60 * 1000).toISOString();
  }

  function query(skip: number): string {
    const params = new URLSearchParams();
    if (orgId) params.set('orgId', orgId);
    if (action) params.set('action', action);
    if (result) params.set('result', result);
    if (actorQuery) params.set('actor', actorQuery);
    const from = dateFrom();
    if (from) params.set('from', from);
    params.set('skip', String(skip));
    params.set('take', String(PAGE_SIZE));
    return params.toString();
  }

  async function load(skip: number, append: boolean) {
    setBusy(true);
    setError(null);
    try {
      const [summaryRes, eventsRes] = await Promise.all([
        skip === 0 ? apiFetch<AuditSummary>(`/admin/audit-events/summary?${query(0)}`) : Promise.resolve(summary),
        apiFetch<AuditEventsResponse>(`/admin/audit-events?${query(skip)}`),
      ]);
      if (summaryRes) setSummary(summaryRes);
      setEvents((prev) => (append ? [...prev, ...eventsRes.events] : eventsRes.events));
      setTotal(eventsRes.total);
    } catch (e) {
      setError((e as ApiError).message ?? L('लोड नहीं हो सका।', 'Could not load.'));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load(0, false);
    // intentionally refetches only when a filter actually changes
  }, [orgId, action, result, datePreset, actorQuery]);

  function fmt(iso: string): string {
    return new Date(iso).toLocaleString(hi ? 'hi-IN' : 'en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  function resultTone(r: string): string {
    return r === 'DENIED' ? 'text-danger' : r === 'FAILED' ? 'text-warning' : 'text-success';
  }

  return (
    <div>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        {L('प्रत्येक सुरक्षा-संवेदनशील कार्रवाई यहाँ दर्ज होती है।', 'Every security-sensitive action is recorded here.')}
      </p>

      {error ? <div className="mb-4"><Alert tone="error">{error}</Alert></div> : null}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-line bg-white p-3">
          <div className="text-[10px] font-extrabold uppercase text-muted">{L('कुल (चयनित अवधि)', 'Total (in window)')}</div>
          <div className="text-xl font-black text-navy-950">{summary?.total ?? '—'}</div>
        </div>
        <div className="rounded-lg border border-line bg-white p-3">
          <div className="text-[10px] font-extrabold uppercase text-muted">{L('अस्वीकृत', 'Denied')}</div>
          <div className="text-xl font-black text-danger">{summary?.denied ?? '—'}</div>
        </div>
        <div className="rounded-lg border border-line bg-white p-3">
          <div className="text-[10px] font-extrabold uppercase text-muted">{L('विफल', 'Failed')}</div>
          <div className="text-xl font-black text-warning">{summary?.failed ?? '—'}</div>
        </div>
        <div className="rounded-lg border border-line bg-white p-3">
          <div className="text-[10px] font-extrabold uppercase text-muted">{L('सफल', 'Success')}</div>
          <div className="text-xl font-black text-success">{summary?.success ?? '—'}</div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-line bg-surface-soft p-3">
        <div>
          <label className="mb-1 block text-[10px] font-extrabold uppercase text-muted">{L('संस्थान', 'Institution')}</label>
          <select value={orgId} onChange={(e) => setOrgId(e.target.value)} className="min-h-[34px] rounded-md border border-line bg-white px-2 text-xs">
            <option value="">{L('सभी संस्थान', 'All institutions')}</option>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-extrabold uppercase text-muted">{L('अवधि', 'Date range')}</label>
          <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)} className="min-h-[34px] rounded-md border border-line bg-white px-2 text-xs">
            {DATE_PRESETS.map((p) => <option key={p.value} value={p.value}>{hi ? p.hi : p.en}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-extrabold uppercase text-muted">{L('कार्रवाई प्रकार', 'Action type')}</label>
          <select value={action} onChange={(e) => setAction(e.target.value)} className="min-h-[34px] rounded-md border border-line bg-white px-2 text-xs">
            {ACTION_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{hi ? c.hi : c.en}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-extrabold uppercase text-muted">{L('परिणाम', 'Result')}</label>
          <select value={result} onChange={(e) => setResult(e.target.value)} className="min-h-[34px] rounded-md border border-line bg-white px-2 text-xs">
            <option value="">{L('सभी परिणाम', 'All results')}</option>
            <option value="FAILED">{L('केवल विफल', 'Failed only')}</option>
            <option value="DENIED">{L('केवल अस्वीकृत', 'Denied only')}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-extrabold uppercase text-muted">{L('करने वाला', 'Actor')}</label>
          <SearchInput placeholder={L('नाम या ईमेल…', 'Name or email…')} onSearch={setActorQuery} />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-white">
        {events.length === 0 ? (
          <p className="p-6 text-sm text-muted">{busy ? L('लोड हो रहा है…', 'Loading…') : L('कोई गतिविधि नहीं मिली।', 'No activity found.')}</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {events.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-soft"
                >
                  <span className="min-w-0">
                    <span className="font-bold text-ink">{auditLabel(e.action, locale)}</span>
                    <span className="ml-2 text-xs text-muted">{e.actorName ?? L('अज्ञात', 'Unknown')}{e.actorRole ? ` · ${e.actorRole}` : ''}</span>
                    <span className="ml-2 text-xs text-muted">{fmt(e.createdAt)}</span>
                  </span>
                  <span className={`whitespace-nowrap text-xs font-extrabold ${resultTone(e.result)}`}>{resultLabel(e.result, locale)}</span>
                </button>
                {expandedId === e.id ? (
                  <div className="grid grid-cols-2 gap-3 bg-surface-soft px-4 py-3 text-xs">
                    <div>
                      <div className="mb-0.5 font-extrabold uppercase text-muted">{L('कारण', 'Reason')}</div>
                      <div>{e.reasonCode ?? '—'}</div>
                    </div>
                    <div>
                      <div className="mb-0.5 font-extrabold uppercase text-muted">{L('लक्ष्य', 'Target')}</div>
                      <div>{e.targetType ? `${e.targetType} · ${e.targetId}` : '—'}</div>
                    </div>
                    {e.before != null ? (
                      <div><div className="mb-0.5 font-extrabold uppercase text-muted">{L('पहले', 'Before')}</div><pre className="overflow-x-auto rounded border border-line bg-white p-2">{JSON.stringify(e.before, null, 1)}</pre></div>
                    ) : null}
                    {e.after != null ? (
                      <div><div className="mb-0.5 font-extrabold uppercase text-muted">{L('बाद में', 'After')}</div><pre className="overflow-x-auto rounded border border-line bg-white p-2">{JSON.stringify(e.after, null, 1)}</pre></div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {events.length > 0 && events.length < total ? (
        <div className="mt-3 text-center">
          <button type="button" disabled={busy} onClick={() => void load(events.length, true)} className="rounded-md border border-line bg-white px-4 py-2 text-xs font-extrabold text-navy-900 hover:bg-surface-soft">
            {L(`${PAGE_SIZE} और लोड करें…`, `Load ${PAGE_SIZE} more…`)}
          </button>
        </div>
      ) : null}
    </div>
  );
}
