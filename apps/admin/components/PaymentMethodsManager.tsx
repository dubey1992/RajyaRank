'use client';
import { useState } from 'react';
import { Button, ConfirmDialog, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import type { SavedPaymentMethodView, SetupPaymentMethodResponse } from '@rajyarank/contracts';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const NETWORK_LABEL: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  rupay: 'RuPay',
  amex: 'Amex',
  diners: 'Diners',
  maestro: 'Maestro',
};

export function PaymentMethodsManager({ initial, locale }: { initial: SavedPaymentMethodView[]; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [cards, setCards] = useState<SavedPaymentMethodView[]>(initial);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<SavedPaymentMethodView | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<'success' | 'error'>('success');

  async function refresh() {
    try {
      const rows = await apiFetch<SavedPaymentMethodView[]>('/payment-methods');
      setCards(rows);
    } catch {
      // Keep showing the last-known list rather than clearing it on a transient failure.
    }
  }

  async function addCard() {
    setAdding(true);
    try {
      const setup = await apiFetch<SetupPaymentMethodResponse>('/payment-methods/setup-intent', { method: 'POST' });
      if (!setup.razorpayKeyId) {
        setToastTone('error');
        setToast(L('इस डेमो में कार्ड सेव करना बंद है (Razorpay कुंजी सेट नहीं)।', 'Card saving is disabled here (no Razorpay key configured).'));
        return;
      }
      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) {
        setToastTone('error');
        setToast(L('भुगतान विंडो लोड नहीं हो सकी।', 'Could not load the payment window.'));
        return;
      }
      const rzp = new window.Razorpay({
        key: setup.razorpayKeyId,
        order_id: setup.providerOrderId,
        customer_id: setup.razorpayCustomerId,
        amount: setup.amountMinor,
        currency: setup.currency,
        save: 1,
        name: 'RajyaRank',
        description: L('कार्ड सत्यापन — ₹1, तुरंत वापस किया जाएगा', 'Card verification — ₹1, refunded immediately'),
        handler: async (resp: { razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await apiFetch('/payment-methods/confirm', {
              method: 'POST',
              body: JSON.stringify({
                razorpayOrderId: setup.providerOrderId,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
              }),
            });
            await refresh();
            setToastTone('success');
            setToast(L('कार्ड सेव हो गया।', 'Card saved.'));
          } catch (e) {
            setToastTone('error');
            setToast((e as ApiError).message);
          }
        },
      });
      rzp.open();
    } catch (e) {
      setToastTone('error');
      setToast((e as ApiError).message);
    } finally {
      setAdding(false);
    }
  }

  async function setDefault(card: SavedPaymentMethodView) {
    setBusyId(card.id);
    try {
      await apiFetch(`/payment-methods/${card.id}/default`, { method: 'PATCH' });
      await refresh();
    } catch (e) {
      setToastTone('error');
      setToast((e as ApiError).message);
    } finally {
      setBusyId(null);
    }
  }

  async function removeCard() {
    if (!removeTarget) return;
    setBusyId(removeTarget.id);
    try {
      await apiFetch(`/payment-methods/${removeTarget.id}`, { method: 'DELETE' });
      setRemoveTarget(null);
      await refresh();
      setToastTone('success');
      setToast(L('कार्ड हटा दिया गया।', 'Card removed.'));
    } catch (e) {
      setToastTone('error');
      setToast((e as ApiError).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-lg font-black text-navy-900">{L('भुगतान माध्यम', 'Payment methods')}</h2>
        <Button variant="outline" onClick={() => void addCard()} loading={adding} className="min-h-0 px-3 py-1.5 text-xs">
          {L('+ कार्ड जोड़ें', '+ Add card')}
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted">
        {L(
          'भविष्य में तेज़ी से भुगतान के लिए कार्ड सुरक्षित रूप से सेव करें। पूरा कार्ड नंबर या CVV हमारे सर्वर पर कभी नहीं आता — केवल Razorpay के पास सुरक्षित रहता है।',
          'Save a card for faster checkout later. The full card number/CVV never reaches our servers — only Razorpay holds those securely.',
        )}
      </p>
      {cards.length === 0 ? (
        <p className="text-sm text-muted">{L('अभी कोई सेव किया कार्ड नहीं।', 'No saved cards yet.')}</p>
      ) : (
        <div className="grid gap-2">
          {cards.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface-soft p-3">
              <span className="text-sm">
                •••• {c.cardLast4} · {NETWORK_LABEL[c.cardNetwork.toLowerCase()] ?? c.cardNetwork} · {L('समाप्ति', 'Expires')} {String(c.expiryMonth).padStart(2, '0')}/{String(c.expiryYear).slice(-2)}
                {c.isDefault ? <span className="ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-extrabold text-success">{L('डिफ़ॉल्ट', 'Default')}</span> : null}
              </span>
              <span className="flex gap-2">
                {!c.isDefault ? (
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() => void setDefault(c)}
                    className="rounded-md border border-line bg-white px-2 py-1 text-xs font-bold hover:bg-surface-soft disabled:opacity-50"
                  >
                    {L('डिफ़ॉल्ट बनाएँ', 'Set as default')}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busyId === c.id}
                  onClick={() => setRemoveTarget(c)}
                  className="rounded-md border border-line bg-white px-2 py-1 text-xs font-bold text-danger hover:bg-surface-soft disabled:opacity-50"
                >
                  {L('हटाएँ', 'Remove')}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!removeTarget}
        title={L('कार्ड हटाएँ?', 'Remove this card?')}
        message={removeTarget ? L(`•••• ${removeTarget.cardLast4} हटाया जाएगा।`, `•••• ${removeTarget.cardLast4} will be removed.`) : undefined}
        confirmLabel={L('हटाएँ', 'Remove')}
        cancelLabel={L('रद्द करें', 'Cancel')}
        tone="danger"
        busy={busyId === removeTarget?.id}
        onConfirm={() => void removeCard()}
        onCancel={() => setRemoveTarget(null)}
      />
      <Toast message={toast} tone={toastTone} onDismiss={() => setToast(null)} />
    </section>
  );
}
