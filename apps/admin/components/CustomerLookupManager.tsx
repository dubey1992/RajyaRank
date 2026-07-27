'use client';
import { useState } from 'react';
import { Alert, ConfirmDialog, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { SearchInput } from './SearchInput';
import type { CustomerDetail, CustomerSearchResult } from '@rajyarank/contracts';

const STATUS_TONE: Record<string, string> = {
  ACTIVE: 'bg-teal-100 text-success',
  SUSPENDED: 'bg-orange-100 text-danger',
  DISABLED: 'bg-line text-muted',
  PAID: 'bg-teal-100 text-success',
  RESOLVED: 'bg-teal-100 text-success',
  CLOSED: 'bg-line text-muted',
  ANSWERED: 'bg-teal-100 text-success',
};
function tone(status: string): string {
  return STATUS_TONE[status] ?? 'bg-surface-soft text-muted';
}

function money(amountMinor: number, currency: string): string {
  return `${currency === 'INR' ? '₹' : currency + ' '}${(amountMinor / 100).toLocaleString('en-IN')}`;
}
function fmtDate(iso: string, hi: boolean): string {
  return new Date(iso).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function CustomerLookupManager({ locale }: { locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState<{ title: string; message: string; danger: boolean; run: () => Promise<void> } | null>(null);

  async function search(q: string) {
    setSearched(!!q);
    if (!q) { setResults([]); return; }
    try {
      setResults(await apiFetch<CustomerSearchResult[]>(`/admin/customer-lookup?search=${encodeURIComponent(q)}`));
    } catch (e) {
      setError((e as ApiError).message ?? L('खोज विफल रही।', 'Search failed.'));
    }
  }

  async function open(id: string) {
    setBusy(true);
    setError(null);
    try {
      setDetail(await apiFetch<CustomerDetail>(`/admin/customer-lookup/${id}`));
    } catch (e) {
      setError((e as ApiError).message ?? L('लोड नहीं हो सका।', 'Could not load.'));
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    if (detail) await open(detail.id);
  }

  function confirmAction(path: 'force-password-reset' | 'revoke-sessions', title: string, message: string, ok: string, danger: boolean) {
    setPending({
      title,
      message,
      danger,
      run: async () => {
        if (!detail) return;
        await apiFetch(`/admin/students/${detail.id}/${path}`, { method: 'POST' });
        setToast(ok);
        await refresh();
      },
    });
  }

  async function confirmRun() {
    if (!pending) return;
    setBusy(true);
    try {
      await pending.run();
    } catch (e) {
      setError((e as ApiError).message ?? L('क्रिया विफल रही।', 'Action failed.'));
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  if (error) {
    return <div className="mb-4"><Alert tone="error">{error}</Alert></div>;
  }

  if (!detail) {
    return (
      <div>
        <div className="mb-4">
          <SearchInput placeholder={L('नाम, ईमेल, फ़ोन या ऑर्डर आईडी…', 'Name, email, phone, or order id…')} onSearch={(q) => void search(q)} />
        </div>
        {searched && results.length === 0 ? (
          <p className="text-sm text-muted">{L('कोई छात्र नहीं मिला।', 'No student found.')}</p>
        ) : results.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-soft text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">{L('नाम', 'Name')}</th>
                  <th className="px-3 py-2">{L('ईमेल', 'Email')}</th>
                  <th className="px-3 py-2">{L('फ़ोन', 'Phone')}</th>
                  <th className="px-3 py-2">{L('स्थिति', 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {results.map((r) => (
                  <tr key={r.id} className="cursor-pointer hover:bg-surface-soft" onClick={() => void open(r.id)}>
                    <td className="px-3 py-2 font-bold text-ink">{r.fullName || '—'}</td>
                    <td className="px-3 py-2 text-muted">{r.email ?? '—'}</td>
                    <td className="px-3 py-2 text-muted">{r.phone}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${tone(r.status)}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <button type="button" onClick={() => setDetail(null)} className="w-fit text-sm font-bold text-navy-900 hover:underline">
        ← {L('खोज पर वापस जाएँ', 'Back to search')}
      </button>

      <Toast message={toast} onDismiss={() => setToast(null)} />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-lg border border-line bg-white p-5 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-navy-900 to-navy-700 text-lg font-black text-white">
            {(detail.fullName || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')}
          </span>
          <div className="mt-3 text-base font-black text-navy-900">{detail.fullName || L('छात्र', 'Student')}</div>
          <div className="text-xs text-muted">{detail.orgName ?? L('स्वतंत्र छात्र', 'Independent student')}</div>
          <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-extrabold ${tone(detail.status)}`}>{detail.status}</span>
          <div className="mt-4 grid gap-1.5 text-left text-xs text-muted">
            <div>✉️ {detail.email ?? '—'}</div>
            <div>📞 {detail.phone}</div>
            <div>{L('सदस्य बने', 'Member since')} {fmtDate(detail.createdAt, hi)}</div>
            <div>{L('अंतिम लॉगिन', 'Last login')} {detail.lastLoginAt ? fmtDate(detail.lastLoginAt, hi) : L('कभी नहीं', 'Never')}</div>
          </div>

          <div className="mt-4 grid gap-2 text-left">
            <div className="text-xs font-extrabold uppercase text-muted">{L('त्वरित कार्रवाई', 'Quick actions')}</div>
            <button type="button" disabled={busy} onClick={() => confirmAction('force-password-reset', L('पासवर्ड रीसेट?', 'Force password reset?'), L('यह छात्र को पासवर्ड रीसेट के लिए बाध्य करेगा।', 'This forces the student to reset their password.'), L('पासवर्ड रीसेट ईमेल भेजा गया।', 'Password-reset email sent.'), false)} className="rounded-md border border-line px-3 py-1.5 text-xs font-bold text-navy-900 hover:bg-surface-soft">
              {L('पासवर्ड रीसेट', 'Force password reset')}
            </button>
            <button type="button" disabled={busy} onClick={() => confirmAction('revoke-sessions', L('सभी सत्र रद्द करें?', 'Revoke all sessions?'), L('यह छात्र के सभी सक्रिय सत्र समाप्त कर देगा।', 'This signs the student out of all active sessions.'), L('सत्र रद्द कर दिए गए।', 'Sessions revoked.'), true)} className="rounded-md border border-line px-3 py-1.5 text-xs font-bold text-danger hover:bg-orange-100/50">
              {L('सभी सत्र रद्द करें', 'Revoke all sessions')}
            </button>
          </div>
        </aside>

        <div className="grid gap-4">
          <section className="rounded-lg border border-line bg-white p-5">
            <h3 className="mb-3 text-sm font-black text-navy-900">{L('ऑर्डर व भुगतान', 'Orders & payments')}</h3>
            {detail.orders.length === 0 ? (
              <p className="text-xs text-muted">{L('कोई ऑर्डर नहीं।', 'No orders.')}</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="text-muted"><tr><th className="pb-2">{L('तारीख़', 'Date')}</th><th className="pb-2">{L('उत्पाद', 'Product')}</th><th className="pb-2">{L('राशि', 'Amount')}</th><th className="pb-2">{L('स्थिति', 'Status')}</th><th className="pb-2">{L('कूपन', 'Coupon')}</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {detail.orders.map((o) => (
                    <tr key={o.id}>
                      <td className="py-2">{fmtDate(o.createdAt, hi)}</td>
                      <td className="py-2">{hi ? o.productTitleHi : o.productTitleEn}</td>
                      <td className="py-2 font-bold">{money(o.amountMinor, o.currency)}</td>
                      <td className="py-2"><span className={`rounded-full px-2 py-0.5 font-extrabold ${tone(o.status)}`}>{o.status}</span></td>
                      <td className="py-2 text-muted">{o.couponCode ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-lg border border-line bg-white p-5">
              <h3 className="mb-3 text-sm font-black text-navy-900">{L('अधिकार', 'Entitlements')}</h3>
              {detail.entitlements.length === 0 ? <p className="text-xs text-muted">{L('कोई अधिकार नहीं।', 'No entitlements.')}</p> : (
                <div className="grid gap-2">
                  {detail.entitlements.map((e) => (
                    <div key={e.id} className="text-xs">
                      <div className="font-bold text-ink">{hi ? e.productTitleHi : e.productTitleEn}</div>
                      <div className="text-muted">{L('से', 'from')} {fmtDate(e.startsAt ?? detail.createdAt, hi)} · {e.endsAt ? `${L('तक', 'until')} ${fmtDate(e.endsAt, hi)}` : L('कोई समाप्ति नहीं', 'no expiry')}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-lg border border-line bg-white p-5">
              <h3 className="mb-3 text-sm font-black text-navy-900">{L('सहायता इतिहास', 'Support history')}</h3>
              {detail.tickets.length === 0 && detail.doubts.length === 0 ? <p className="text-xs text-muted">{L('कोई इतिहास नहीं।', 'No history.')}</p> : (
                <div className="grid gap-2">
                  {detail.tickets.map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-xs">
                      <div><div className="font-bold text-ink">{t.subject}</div><div className="text-muted">{L('टिकट', 'Ticket')} · {t.replyCount} {L('उत्तर', 'replies')}</div></div>
                      <span className={`rounded-full px-2 py-0.5 font-extrabold ${tone(t.status)}`}>{t.status}</span>
                    </div>
                  ))}
                  {detail.doubts.map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-xs">
                      <div><div className="font-bold text-ink line-clamp-1">{d.bodyText}</div><div className="text-muted">{L('संदेह', 'Doubt')} · {d.replyCount} {L('उत्तर', 'replies')}</div></div>
                      <span className={`rounded-full px-2 py-0.5 font-extrabold ${tone(d.status)}`}>{d.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-lg border border-line bg-white p-5">
              <h3 className="mb-3 text-sm font-black text-navy-900">{L('सक्रिय सत्र', 'Active sessions')}</h3>
              {detail.sessions.length === 0 ? <p className="text-xs text-muted">{L('कोई सक्रिय सत्र नहीं।', 'No active sessions.')}</p> : (
                <div className="grid gap-2">
                  {detail.sessions.map((s) => (
                    <div key={s.id} className="text-xs">
                      <div className="font-bold text-ink">{s.userAgent ?? L('अज्ञात डिवाइस', 'Unknown device')}</div>
                      <div className="text-muted">{s.ip ?? L('अज्ञात IP', 'Unknown IP')} · {L('अंतिम उपयोग', 'last used')} {fmtDate(s.lastUsedAt, hi)}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-lg border border-line bg-white p-5">
              <h3 className="mb-3 text-sm font-black text-navy-900">{L('हाल की गतिविधि', 'Recent activity')}</h3>
              {detail.activity.length === 0 ? <p className="text-xs text-muted">{L('कोई गतिविधि नहीं।', 'No activity.')}</p> : (
                <div className="grid gap-1.5">
                  {detail.activity.map((a) => (
                    <div key={a.id} className="flex items-baseline gap-2 text-xs">
                      <span className="w-16 flex-none text-muted">{fmtDate(a.createdAt, hi)}</span>
                      <span className={a.result === 'FAILED' || a.result === 'DENIED' ? 'text-danger' : 'text-ink'}>{a.action}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!pending}
        title={pending?.title ?? ''}
        message={pending?.message}
        confirmLabel={L('पुष्टि करें', 'Confirm')}
        cancelLabel={L('रद्द करें', 'Cancel')}
        tone={pending?.danger ? 'danger' : 'default'}
        busy={busy}
        onConfirm={() => void confirmRun()}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
