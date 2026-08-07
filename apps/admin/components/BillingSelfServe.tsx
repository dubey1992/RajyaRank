'use client';
import { useState } from 'react';
import { Alert, Button, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import type { SubscriptionPlanView, MySubscriptionView } from '@rajyarank/contracts';

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

  const activeSub = summary.subscription?.status === 'ACTIVE' ? summary.subscription : null;

  async function buy(planId: string, billingCycle: 'MONTHLY' | 'ANNUAL') {
    setBusyKey(`${planId}-${billingCycle}`);
    setError(null);
    try {
      await apiFetch('/academic/billing/subscribe', { method: 'POST', body: JSON.stringify({ planId, billingCycle }) });
      const refreshed = await apiFetch<MySubscriptionView>('/academic/billing/subscription');
      setSummary(refreshed);
      setToast(
        L(
          'योजना सक्रिय कर दी गई है। भुगतान को अधिकृत करने के लिए Razorpay से मिला लिंक जांचें।',
          'Plan activated. Check your email for the Razorpay link to authorize payment.',
        ),
      );
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusyKey(null);
    }
  }

  if (!summary.kycVerified) {
    return (
      <Alert tone="info">
        {L(
          'सब्सक्रिप्शन योजना खरीदने से पहले अपने संस्थान का KYC सत्यापन पूरा करें। KYC सबमिट करने के बाद, RajyaRank टीम इसकी समीक्षा कर सत्यापित करेगी — उसके बाद यह पेज योजनाएँ दिखाएगा।',
          "Complete your institution's KYC verification before purchasing a subscription plan. Once you submit it, the RajyaRank team reviews and verifies it — this page will show plans to buy right after.",
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
      ) : summary.subscription ? (
        <Alert tone="error">
          {L(
            `आपकी पिछली योजना ${summary.subscription.status === 'CANCELED' ? 'रद्द कर दी गई थी' : 'भुगतान लंबित होने से रुक गई थी'}। नीचे से एक योजना चुनकर इसे नवीनीकृत करें।`,
            `Your previous plan was ${summary.subscription.status === 'CANCELED' ? 'canceled' : 'paused for a missed payment'}. Pick a plan below to renew.`,
          )}
        </Alert>
      ) : null}

      {error ? <Alert tone="error">{error}</Alert> : null}

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
                <li>{L('स्टोरेज', 'Storage')}: {p.storageGb} GB</li>
              </ul>
              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isCurrent}
                  loading={busyKey === `${p.id}-MONTHLY`}
                  onClick={() => void buy(p.id, 'MONTHLY')}
                >
                  {L('मासिक खरीदें', 'Buy monthly')} · {rupees(p.priceMonthlyMinor)}
                </Button>
                <Button
                  type="button"
                  disabled={isCurrent}
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
