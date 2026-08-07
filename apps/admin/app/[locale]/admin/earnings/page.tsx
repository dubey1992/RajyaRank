import { cookies } from 'next/headers';
import { Alert } from '@rajyarank/ui';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { EarningsPayoutsPanel } from '@/components/EarningsPayoutsPanel';
import type { InstitutionEarningsView, KycSubmissionView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function EarningsPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { kycRequired?: string };
}) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  // Both gates skipped: this IS the KYC destination (skipKycGate), and a Head
  // who was just routed here for missing KYC also has no active subscription
  // by definition (buying a plan requires KYC to already be VERIFIED) — without
  // skipSubscriptionGate too, landing here would immediately bounce back to
  // /admin/profile?subscriptionRequired=1, which bounces back to the KYC
  // redirect target, looping the Head between the two screens forever.
  const me = await getMeOrRedirect(locale, { skipKycGate: true, skipSubscriptionGate: true });
  const title = hi ? 'कमाई व भुगतान' : 'Earnings & Payouts';
  const kycRequired = searchParams.kycRequired === '1';

  if (!can(me, 'course.manage')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="course.manage" />
      </Shell>
    );
  }

  const cookie = cookies().toString();
  const [earnings, kyc] = await Promise.all([
    apiFetchServer<InstitutionEarningsView>('/academic/settlements/earnings', cookie),
    apiFetchServer<KycSubmissionView | null>('/academic/settlements/kyc', cookie),
  ]);

  if (!earnings) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} />
      </Shell>
    );
  }

  return (
    <Shell me={me} locale={locale} title={title}>
      {kycRequired ? (
        <div className="mb-4">
          <Alert tone="error">
            {hi
              ? 'अन्य सुविधाओं तक पहुँचने से पहले कृपया अपने संस्थान का KYC सबमिट करें और सत्यापित करवाएँ।'
              : "Please complete and get your institution's KYC verified before accessing other features."}
          </Alert>
        </div>
      ) : null}
      <p className="mb-4 max-w-2xl text-sm text-muted">
        {hi ? 'संस्थान के लिए पारदर्शी भुगतान विवरण।' : 'Transparent payout breakdown for the institution.'}
      </p>
      <EarningsPayoutsPanel earnings={earnings} kyc={kyc ?? null} locale={locale} />
    </Shell>
  );
}
