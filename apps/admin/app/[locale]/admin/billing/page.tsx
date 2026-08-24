import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { BillingSelfServe } from '@/components/BillingSelfServe';
import type { MySubscriptionView, SubscriptionPlanView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

/** Academic Head self-serve subscribe/renew — reachable even while the
 *  subscription gate is blocking the rest of the app (that's precisely why a
 *  Head with no active plan would be here), so skipSubscriptionGate. The KYC
 *  gate stays on: buying a plan is deliberately sequenced after KYC. */
export default async function BillingPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const me = await getMeOrRedirect(locale, { skipSubscriptionGate: true });
  // Role-checked, not permission-checked — course.manage alone is too broad
  // (Content Admin holds it too); see AcademicBillingController's matching
  // backend gate. This page previously had no gate at all — any staff member
  // could reach it (the underlying endpoints were the only thing stopping
  // them, and course.manage let Content Admin through those too).
  if (!me.roleKeys.includes('ACADEMIC_HEAD')) {
    return (
      <Shell me={me} locale={locale} title={L('सदस्यता व बिलिंग', 'Subscription & billing')}>
        <AccessDenied locale={locale} />
      </Shell>
    );
  }
  const cookieHeader = cookies().toString();
  const [summary, plans] = await Promise.all([
    apiFetchServer<MySubscriptionView>('/academic/billing/subscription', cookieHeader),
    apiFetchServer<SubscriptionPlanView[]>('/academic/billing/plans', cookieHeader),
  ]);

  return (
    <Shell me={me} locale={locale} title={L('सदस्यता व बिलिंग', 'Subscription & billing')}>
      <p className="mb-4 text-sm text-muted">
        {L(
          'यहाँ से अपने संस्थान की सदस्यता खुद खरीदें या नवीनीकृत करें — Super Admin की प्रतीक्षा करने की ज़रूरत नहीं।',
          "Buy or renew your institution's subscription right here — no need to wait on a Super Admin.",
        )}
      </p>
      {summary && plans ? (
        <BillingSelfServe initialSummary={summary} plans={plans} locale={locale} />
      ) : (
        <p className="text-sm text-muted">{L('लोड नहीं हो सका।', 'Could not load.')}</p>
      )}
    </Shell>
  );
}
