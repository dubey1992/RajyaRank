'use client';
import { useState } from 'react';
import { Alert, Button, Toast } from '@rajyarank/ui';
import { apiFetch, apiDownload, type ApiError } from '@/lib/api';
import type { OrganizationSubscriptionView, InstitutionInvoiceView, SubscriptionPlanView } from '@rajyarank/contracts';

function rupees(minor: number) {
  return `₹${(minor / 100).toLocaleString('en-IN')}`;
}

const STATUS_TONE: Record<string, string> = {
  ACTIVE: 'bg-teal-100 text-success',
  TRIALING: 'bg-blue-100 text-blue-700',
  PAST_DUE: 'bg-orange-100 text-danger',
  CANCELED: 'bg-line text-muted',
  PAID: 'bg-teal-100 text-success',
  PENDING: 'bg-orange-100 text-orange-700',
  OVERDUE: 'bg-orange-100 text-danger',
  VOID: 'bg-line text-muted',
};

export function InstitutionBillingManager({
  initialSubscriptions,
  initialInvoices,
  plans,
  unsubscribedOrgs,
  locale,
}: {
  initialSubscriptions: OrganizationSubscriptionView[];
  initialInvoices: InstitutionInvoiceView[];
  plans: SubscriptionPlanView[];
  unsubscribedOrgs: { id: string; name: string }[];
  locale: 'hi' | 'en';
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [invoices] = useState(initialInvoices);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [orgId, setOrgId] = useState('');
  const [planId, setPlanId] = useState(plans[0]?.id ?? '');
  const [cycle, setCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  async function downloadInvoicePdf(invoice: InstitutionInvoiceView) {
    setDownloadingId(invoice.id);
    try {
      await apiDownload(`/admin/billing/invoices/${invoice.id}/pdf`, `${invoice.invoiceNumber}.pdf`);
    } catch (e) {
      setToast((e as ApiError).message);
    } finally {
      setDownloadingId(null);
    }
  }

  async function sendInvoiceEmail(invoice: InstitutionInvoiceView) {
    setSendingId(invoice.id);
    try {
      const res = await apiFetch<{ sent: boolean; to: string }>(`/admin/billing/invoices/${invoice.id}/send`, { method: 'POST' });
      setToast(L(`चालान ${res.to} पर भेज दिया गया।`, `Invoice sent to ${res.to}.`));
    } catch (e) {
      setToast((e as ApiError).message);
    } finally {
      setSendingId(null);
    }
  }

  async function subscribe() {
    if (!orgId || !planId) {
      setError(L('संस्थान और योजना चुनें।', 'Select an institution and a plan.'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await apiFetch<{ id: string }>(`/admin/billing/organizations/${orgId}/subscribe`, {
        method: 'POST',
        body: JSON.stringify({ planId, billingCycle: cycle }),
      });
      const refreshed = await apiFetch<OrganizationSubscriptionView[]>('/admin/billing/subscriptions');
      setSubscriptions(refreshed);
      setToast(L('संस्थान को योजना दी गई।', 'Institution subscribed.'));
      void created;
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('संस्थान भुगतान स्वास्थ्य', 'Institution payment health')} ({subscriptions.length})</h2>
        {subscriptions.length === 0 ? (
          <p className="mb-4 text-sm text-muted">{L('अभी कोई संस्थान सब्सक्राइब नहीं है।', 'No institution is subscribed yet.')}</p>
        ) : (
          <div className="mb-2 overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-soft text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">{L('संस्थान', 'Institution')}</th>
                  <th className="px-3 py-2">{L('योजना', 'Plan')}</th>
                  <th className="px-3 py-2">{L('बिलिंग', 'Billing')}</th>
                  <th className="px-3 py-2">{L('अगली अवधि समाप्ति', 'Period ends')}</th>
                  <th className="px-3 py-2">{L('स्थिति', 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {subscriptions.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2 font-bold text-ink">{s.orgName}</td>
                    <td className="px-3 py-2">{hi ? s.planNameHi : s.planNameEn}</td>
                    <td className="px-3 py-2">{s.billingCycle === 'MONTHLY' ? L('मासिक', 'Monthly') : L('वार्षिक', 'Annual')}</td>
                    <td className="px-3 py-2">{s.currentPeriodEnd ? s.currentPeriodEnd.slice(0, 10) : '—'}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${STATUS_TONE[s.status] ?? 'bg-line text-muted'}`}>{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {unsubscribedOrgs.length ? (
          <>
            <h3 className="mb-2 mt-4 text-sm font-extrabold text-navy-900">{L('संस्थान को सब्सक्राइब करें', 'Subscribe an institution')}</h3>
            {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}
            <div className="grid gap-3 sm:grid-cols-4">
              <select value={orgId} onChange={(e) => setOrgId(e.target.value)} className="rounded-md border border-line px-3 py-3 text-sm">
                <option value="">{L('संस्थान चुनें…', 'Select institution…')}</option>
                {unsubscribedOrgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <select value={planId} onChange={(e) => setPlanId(e.target.value)} className="rounded-md border border-line px-3 py-3 text-sm">
                {plans.map((p) => <option key={p.id} value={p.id}>{hi ? p.nameHi : p.nameEn}</option>)}
              </select>
              <select value={cycle} onChange={(e) => setCycle(e.target.value as 'MONTHLY' | 'ANNUAL')} className="rounded-md border border-line px-3 py-3 text-sm">
                <option value="MONTHLY">{L('मासिक', 'Monthly')}</option>
                <option value="ANNUAL">{L('वार्षिक', 'Annual')}</option>
              </select>
              <Button onClick={() => void subscribe()} loading={busy}>{L('सब्सक्राइब करें', 'Subscribe')}</Button>
            </div>
          </>
        ) : null}
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('संस्थान चालान', 'Institute invoices')} ({invoices.length})</h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted">{L('अभी कोई चालान नहीं।', 'No invoices yet.')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-soft text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">{L('चालान #', 'Invoice #')}</th>
                  <th className="px-3 py-2">{L('संस्थान', 'Institution')}</th>
                  <th className="px-3 py-2">{L('अवधि', 'Period')}</th>
                  <th className="px-3 py-2">{L('आधार योजना', 'Base plan')}</th>
                  <th className="px-3 py-2">{L('कुल', 'Total')}</th>
                  <th className="px-3 py-2">{L('देय तिथि', 'Due')}</th>
                  <th className="px-3 py-2">{L('स्थिति', 'Status')}</th>
                  <th className="px-3 py-2 text-right">{L('कार्रवाई', 'Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {invoices.map((i) => (
                  <tr key={i.id}>
                    <td className="px-3 py-2 font-mono text-xs">{i.invoiceNumber}</td>
                    <td className="px-3 py-2 font-bold text-ink">{i.orgName}</td>
                    <td className="px-3 py-2">{i.periodLabel}</td>
                    <td className="px-3 py-2">{rupees(i.basePlanMinor)}</td>
                    <td className="px-3 py-2">{rupees(i.totalMinor)}</td>
                    <td className="px-3 py-2">{i.dueAt.slice(0, 10)}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${STATUS_TONE[i.status] ?? 'bg-line text-muted'}`}>{i.status}</span></td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <button type="button" disabled={downloadingId === i.id} className="rounded-md border border-line px-2 py-1 text-xs font-bold hover:bg-surface-soft disabled:opacity-50" onClick={() => void downloadInvoicePdf(i)}>
                          {downloadingId === i.id ? L('डाउनलोड हो रहा है…', 'Downloading…') : L('PDF', 'PDF')}
                        </button>
                        <button
                          type="button"
                          disabled={sendingId === i.id}
                          title={L('संस्थान के शैक्षणिक प्रमुख को चालान PDF ईमेल करें', "Email the invoice PDF to the institution's Academic Head")}
                          className="rounded-md border border-line px-2 py-1 text-xs font-bold hover:bg-surface-soft disabled:opacity-50"
                          onClick={() => void sendInvoiceEmail(i)}
                        >
                          {sendingId === i.id ? L('भेजा जा रहा है…', 'Sending…') : L('भेजें', 'Send')}
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
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </div>
  );
}
