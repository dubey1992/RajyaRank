'use client';
import { useState } from 'react';
import { Alert, Toast } from '@rajyarank/ui';
import { apiFetch, apiDownload, type ApiError } from '@/lib/api';
import type { AcademicOrderView } from '@rajyarank/contracts';

function rupees(minor: number) {
  return `₹${(minor / 100).toLocaleString('en-IN')}`;
}

const STATUS_TONE: Record<string, string> = {
  PAID: 'bg-teal-100 text-success',
  PENDING: 'bg-orange-100 text-orange-700',
  CREATED: 'bg-orange-100 text-orange-700',
  REFUNDED_FULL: 'bg-line text-muted',
  REFUNDED_PARTIAL: 'bg-line text-muted',
};

export function StudentPaymentsManager({ orders, locale }: { orders: AcademicOrderView[]; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [refundFor, setRefundFor] = useState<AcademicOrderView | null>(null);
  const [refundReason, setRefundReason] = useState('');

  async function downloadReceipt(order: AcademicOrderView) {
    setBusyId(order.id);
    setError(null);
    try {
      await apiDownload(`/academic/orders/${order.id}/receipt`, `receipt-${order.id.slice(0, 8)}.pdf`);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusyId(null);
    }
  }

  async function submitRefundRequest() {
    if (!refundFor?.paymentId) return;
    setBusyId(refundFor.id);
    try {
      const result = await apiFetch<{ status: string }>('/academic/refunds', {
        method: 'POST',
        body: JSON.stringify({ paymentId: refundFor.paymentId, reason: refundReason.trim() || undefined }),
      });
      setToast(
        result.status === 'PENDING_APPROVAL'
          ? L('अनुरोध Super Admin की मंज़ूरी हेतु भेजा गया।', 'Request sent for Super Admin approval.')
          : L('धनवापसी संसाधित की गई।', 'Refund processed.'),
      );
      setRefundFor(null);
      setRefundReason('');
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusyId(null);
    }
  }

  const paidCount = orders.filter((o) => o.status === 'PAID').length;
  const pendingCount = orders.filter((o) => o.status === 'CREATED' || o.status === 'PENDING').length;

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{L('भुगतान किए गए ऑर्डर', 'Paid orders')}</div>
          <div className="mt-1.5 text-2xl font-black text-navy-950">{paidCount}</div>
        </div>
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{L('लंबित भुगतान', 'Pending payments')}</div>
          <div className="mt-1.5 text-2xl font-black text-navy-950">{pendingCount}</div>
        </div>
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{L('कुल ऑर्डर', 'Total orders')}</div>
          <div className="mt-1.5 text-2xl font-black text-navy-950">{orders.length}</div>
        </div>
      </div>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('छात्र ऑर्डर', 'Student orders')} ({orders.length})</h2>
        {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}
        {orders.length === 0 ? (
          <p className="text-sm text-muted">{L('अभी कोई ऑर्डर नहीं।', 'No orders yet.')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-soft text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">{L('छात्र', 'Student')}</th>
                  <th className="px-3 py-2">{L('चैनल', 'Channel')}</th>
                  <th className="px-3 py-2">{L('उत्पाद', 'Product')}</th>
                  <th className="px-3 py-2">{L('राशि', 'Amount')}</th>
                  <th className="px-3 py-2">{L('भुगतान', 'Payment')}</th>
                  <th className="px-3 py-2 text-right">{L('कार्रवाई', 'Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-3 py-2 font-bold text-ink">{o.buyer}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${o.isInternal ? 'bg-teal-100 text-success' : 'bg-blue-100 text-blue-700'}`}>
                        {o.isInternal ? L('आंतरिक', 'Internal') : L('बाहरी', 'External')}
                      </span>
                    </td>
                    <td className="px-3 py-2">{hi ? o.productHi : o.productEn}</td>
                    <td className="px-3 py-2">{rupees(o.amountMinor)}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${STATUS_TONE[o.status] ?? 'bg-line text-muted'}`}>{o.status}</span></td>
                    <td className="px-3 py-2 text-right">
                      {o.status === 'PAID' ? (
                        <div className="flex justify-end gap-1.5">
                          <button type="button" disabled={busyId === o.id} className="rounded-md border border-line px-2 py-1 text-xs font-bold hover:bg-surface-soft disabled:opacity-50" onClick={() => void downloadReceipt(o)}>
                            {busyId === o.id ? L('…', '…') : L('रसीद', 'Receipt')}
                          </button>
                          {o.paymentId ? (
                            <button type="button" className="rounded-md border border-line px-2 py-1 text-xs font-bold text-danger hover:bg-surface-soft" onClick={() => { setRefundFor(o); setRefundReason(''); }}>
                              {L('धनवापसी', 'Refund')}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {refundFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4" onClick={() => setRefundFor(null)}>
          <div className="w-full max-w-md rounded-lg border border-line bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-lg font-black text-navy-900">{L('धनवापसी का अनुरोध करें', 'Request refund')}</h3>
            <p className="mb-3 text-xs text-muted">{hi ? refundFor.productHi : refundFor.productEn} · {rupees(refundFor.amountMinor)} · {refundFor.buyer}</p>
            <label className="mb-1 block text-sm font-extrabold text-ink">{L('कारण (वैकल्पिक)', 'Reason (optional)')}</label>
            <textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)} className="mb-3 min-h-[70px] w-full rounded-md border border-line px-3 py-2 text-sm" />
            <div className="flex justify-end gap-2">
              <button type="button" className="rounded-md border border-line px-3 py-2 text-sm font-bold" onClick={() => setRefundFor(null)}>{L('रद्द करें', 'Cancel')}</button>
              <button type="button" disabled={busyId === refundFor.id} className="rounded-md bg-orange-500 px-4 py-2 text-sm font-extrabold text-white hover:bg-orange-600 disabled:opacity-50" onClick={() => void submitRefundRequest()}>
                {busyId === refundFor.id ? L('भेजा जा रहा है…', 'Submitting…') : L('अनुरोध सबमिट करें', 'Submit request')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </div>
  );
}
