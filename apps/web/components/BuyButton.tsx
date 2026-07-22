'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import type { CreateOrderResponse } from '@rajyarank/contracts';

// Razorpay's checkout.js attaches a global constructor.
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

export function BuyButton({ productId, locale, accessCode }: { productId: string; locale: string; accessCode?: string }) {
  const hi = locale === 'hi';
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function buy() {
    setBusy(true);
    setMsg(null);
    try {
      const order = await apiFetch<CreateOrderResponse>('/orders', {
        method: 'POST',
        body: JSON.stringify(accessCode ? { productId, accessCode } : { productId }),
      });

      if (!order.razorpayKeyId) {
        setMsg(hi ? 'इस डेमो में लाइव भुगतान बंद है (Razorpay कुंजी सेट नहीं)। एडमिन एक्सेस दे सकता है।' : 'Live checkout is disabled here (no Razorpay key). An admin can grant access.');
        return;
      }

      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) {
        setMsg(hi ? 'भुगतान विंडो लोड नहीं हो सकी।' : 'Could not load the payment window.');
        return;
      }

      const rzp = new window.Razorpay({
        key: order.razorpayKeyId,
        order_id: order.providerOrderId,
        amount: order.amountMinor,
        currency: order.currency,
        name: 'RajyaRank',
        description: order.productTitle,
        handler: async (resp: { razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await apiFetch('/payments/razorpay/verify', {
              method: 'POST',
              body: JSON.stringify({
                orderId: order.orderId,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
              }),
            });
            router.push(`/${locale}/account`);
          } catch (e) {
            setMsg((e as ApiError).message);
          }
        },
      });
      rzp.open();
    } catch (e) {
      const err = e as ApiError;
      if (err.code === 'AUTH_INVALID_CREDENTIALS' || err.code === 'PERMISSION_DENIED') router.push(`/${locale}/login`);
      else setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button onClick={() => void buy()} loading={busy} className="w-full">
        {hi ? 'खरीदें' : 'Buy now'}
      </Button>
      {msg ? <div className="mt-2"><Alert tone="info">{msg}</Alert></div> : null}
    </div>
  );
}
