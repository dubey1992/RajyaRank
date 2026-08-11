'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import type { SubscriptionPlanView, MySubscriptionView, SelfServeSubscribeResult } from '@rajyarank/contracts';

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

function rupees(minor: number) {
  return `₹${(minor / 100).toLocaleString('en-IN')}`;
}

const STATUS_TONE: Record<string, string> = {
  ACTIVE: 'bg-teal-100 text-success',
  TRIALING: 'bg-blue-100 text-blue-700',
  PAST_DUE: 'bg-orange-100 text-danger',
  CANCELED: 'bg-line text-muted',
};

/** Academic Head self-serve subscription purchase/renewal — no Super Admin
 *  involvement needed. Gated server-side on KYC verification (course.manage
 *  + kycVerified check inside BillingService.selfServeSubscribe); this
 *  component just reflects that gate in the UI rather than re-deriving it.
 *  A CANCELED/PAST_DUE subscription is "renewed" through the exact same
 *  /academic/billing/subscribe call — the API replaces the row in place. */
export function BillingSelfServe({
  initialSummary,
  plans,
  locale,
}: {
  initialSummary: MySubscriptionView;
  plans: SubscriptionPlanView[];
  locale: 'hi' | 'en';
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [summary, setSummary] = useState(initialSummary);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set only if the in-page Checkout script fails to load — Razorpay's own
  // hosted page for this subscription, as a degrade path (no auto-return to
  // this app afterward, but better than a dead end).
  const [fallbackCheckoutUrl, setFallbackCheckoutUrl] = useState<string | null>(null);

  const activeSub = summary.subscription?.status === 'ACTIVE' ? summary.subscription : null;
  // Awaiting Razorpay authorization — a checkout was started but not
  // completed. Buying again is blocked (server-side 409 too) until this one
  // is either completed or lapses.
  const pendingSub = summary.subscription?.status === 'TRIALING' ? summary.subscription : null;

  async function buy(planId: string, billingCycle: 'MONTHLY' | 'ANNUAL') {
    setBusyKey(`${planId}-${billingCycle}`);
    setError(null);
    setFallbackCheckoutUrl(null);
    try {
      const res = await apiFetch<SelfServeSubscribeResult>('/academic/billing/subscribe', {
        method: 'POST',
        body: JSON.stringify({ planId, billingCycle }),
      });

      if (!res.razorpayKeyId) {
        // Razorpay isn't configured in this environment (dev/local) — nothing
        // to check out with, just reflect the new (TRIALING) state.
        const refreshed = await apiFetch<MySubscriptionView>('/academic/billing/subscription');
        setSummary(refreshed);
        setToast(L('अनुरोध दर्ज कर लिया गया है।', 'Request recorded.'));
        return;
      }

      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) {
        setError(hi ? 'भुगतान विंडो लोड नहीं हो सकी।' : 'Could not load the payment window.');
        setFallbackCheckoutUrl(res.checkoutUrl);
        return;
      }

      const rzp = new window.Razorpay({
        key: res.razorpayKeyId,
        subscription_id: res.subscriptionId,
        name: 'RajyaRank',
        description: L('संस्थान सदस्यता', 'Institution subscription'),
        handler: async (resp: { razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await apiFetch('/academic/billing/subscribe/verify', {
              method: 'POST',
              body: JSON.stringify({
                subscriptionId: res.subscriptionId,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
              }),
            });
            // Full navigation, not client state update: this page may have
            // already rendered the pre-payment (no-plan/TRIALING) view before
            // the Head paid — force a fresh, cookie-and-DB-aware server render
            // so the newly-ACTIVE plan actually shows.
            window.location.reload();
          } catch (e) {
            setError((e as ApiError).message);
          }
        },
      });
      rzp.open();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusyKey(null);
    }
  }

  if (summary.kycState !== 'VERIFIED') {
    return (
      <Alert tone={summary.kycState === 'REJECTED' ? 'error' : 'info'}>
        {summary.kycState === 'PENDING' ? (
          <p>
            {L(
              'आपका KYC सबमिट हो चुका है और RajyaRank टीम द्वारा समीक्षा की जा रही है। सत्यापित होते ही यह पेज योजनाएँ दिखाएगा — आमतौर पर 1-2 कार्यदिवसों में।',
              "Your KYC has been submitted and is under review by the RajyaRank team. This page will show plans to buy as soon as it's verified — usually within 1-2 business days.",
            )}
          </p>
        ) : summary.kycState === 'REJECTED' ? (
          <div>
            <p className="mb-2">
              {L('आपका KYC अस्वीकृत कर दिया गया', 'Your KYC was rejected')}
              {summary.kycRejectionReason ? `: ${summary.kycRejectionReason}` : '.'}
            </p>
            <Link href={`/${locale}/admin/earnings`} className="font-bold underline">
              {L('फिर से सबमिट करें →', 'Resubmit KYC →')}
            </Link>
          </div>
        ) : (
          <div>
            <p className="mb-2">
              {L(
                'सब्सक्रिप्शन योजना खरीदने से पहले अपने संस्थान का KYC सत्यापन पूरा करें।',
                "Complete your institution's KYC verification before purchasing a subscription plan.",
              )}
            </p>
            <Link href={`/${locale}/admin/earnings`} className="font-bold underline">
              {L('KYC सबमिट करें →', 'Submit KYC →')}
            </Link>
          </div>
        )}
      </Alert>
    );
  }

  return (
    <div className="grid gap-4">
      {activeSub ? (
        <Alert tone="success">
          {L(
            `आप अभी ${hi ? activeSub.planNameHi : activeSub.planNameEn} योजना पर हैं, जो ${activeSub.currentPeriodEnd?.slice(0, 10) ?? '—'} तक सक्रिय है।`,
            `You're currently on the ${activeSub.planNameEn} plan, active through ${activeSub.currentPeriodEnd?.slice(0, 10) ?? '—'}.`,
          )}
        </Alert>
      ) : pendingSub ? (
        <Alert tone="info">
          {L(
            `आपने ${hi ? pendingSub.planNameHi : pendingSub.planNameEn} योजना चुनी है, लेकिन भुगतान अभी पूरा नहीं हुआ है। Razorpay पर भुगतान अधिकृत करना पूरा करें — पूरा होते ही आपकी योजना सक्रिय हो जाएगी।`,
            `You started buying the ${pendingSub.planNameEn} plan, but payment hasn't been completed yet. Finish authorizing payment on Razorpay — your plan activates automatically once that's done.`,
          )}
        </Alert>
      ) : summary.subscription ? (
        <Alert tone="error">
          {L(
            `आपकी पिछली योजना ${summary.subscription.status === 'CANCELED' ? 'रद्द कर दी गई थी' : 'भुगतान लंबित होने से रुक गई थी'}। नीचे से एक योजना चुनकर इसे नवीनीकृत करें।`,
            `Your previous plan was ${summary.subscription.status === 'CANCELED' ? 'canceled' : 'paused for a missed payment'}. Pick a plan below to renew.`,
          )}
        </Alert>
      ) : null}

      {error ? (
        <Alert tone="error">
          {error}
          {fallbackCheckoutUrl ? (
            <>
              {' '}
              <a href={fallbackCheckoutUrl} className="font-bold underline">
                {L('इसके बजाय Razorpay पर भुगतान करें →', 'Pay on Razorpay instead →')}
              </a>
            </>
          ) : null}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = activeSub?.planId === p.id;
          return (
            <div key={p.id} className="rounded-lg border border-line bg-white p-5">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-base font-black text-navy-900">{hi ? p.nameHi : p.nameEn}</span>
                {isCurrent ? <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${STATUS_TONE.ACTIVE}`}>{L('मौजूदा', 'Current')}</span> : null}
              </div>
              <ul className="mb-4 grid gap-1 text-xs text-muted">
                <li>{L('सक्रिय छात्र', 'Active students')}: {p.maxActiveStudents.toLocaleString('en-IN')}</li>
                <li>{L('स्टाफ़ सीटें', 'Staff seats')}: {p.maxStaffSeats}</li>
              </ul>
              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isCurrent || !!pendingSub}
                  loading={busyKey === `${p.id}-MONTHLY`}
                  onClick={() => void buy(p.id, 'MONTHLY')}
                >
                  {L('मासिक खरीदें', 'Buy monthly')} · {rupees(p.priceMonthlyMinor)}
                </Button>
                <Button
                  type="button"
                  disabled={isCurrent || !!pendingSub}
                  loading={busyKey === `${p.id}-ANNUAL`}
                  onClick={() => void buy(p.id, 'ANNUAL')}
                >
                  {L('वार्षिक खरीदें', 'Buy annually')} · {rupees(p.priceAnnualMinor)}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </div>
  );
}
