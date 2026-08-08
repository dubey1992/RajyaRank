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

export function BuyButton({
  productId,
  locale,
  accessCode,
  loggedIn = true,
  next,
}: {
  productId: string;
  locale: string;
  accessCode?: string;
  /** Server already knows whether a session cookie is present — skips a
   *  wasted round trip and shows honest button copy instead of "Buy now"
   *  followed by a surprise redirect. */
  loggedIn?: boolean;
  /** Path to return to after login (e.g. this same pricing page) so the
   *  student doesn't lose their place mid-purchase. */
  next?: string;
}) {
  const hi = locale === 'hi';
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!loggedIn) {
    return (
      <Button
        onClick={() => router.push(`/${locale}/login${next ? `?next=${encodeURIComponent(next)}` : ''}`)}
        className="w-full"
      >
        {hi ? 'खरीदने के लिए लॉगिन करें' : 'Login to buy'}
      </Button>
    );
  }

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
            // Full navigation, not router.push: /account (or wherever this
            // page is embedded) may already be sitting in the client Router
            // Cache from before this purchase — a client-side transition can
            // replay that stale pre-payment snapshot instead of fetching the
            // order/entitlement that was just created. Same fix as the
            // post-login redirect in login/page.tsx.
            window.location.assign(`/${locale}/account`);
          } catch (e) {
            setMsg((e as ApiError).message);
          }
        },
      });
      rzp.open();
    } catch (e) {
      const err = e as ApiError;
      if (err.code === 'AUTH_INVALID_CREDENTIALS' || err.code === 'PERMISSION_DENIED') {
        router.push(`/${locale}/login${next ? `?next=${encodeURIComponent(next)}` : ''}`);
      }
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
