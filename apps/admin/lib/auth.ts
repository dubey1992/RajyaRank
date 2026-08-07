import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { KycSubmissionView, MeResponse } from '@rajyarank/contracts';
import { apiFetchServer } from './api';
import type { Locale } from './i18n';

/** Server-side gate for admin pages: returns the staff principal or redirects.
 *  Also funnels an Academic Head to the KYC submission screen (/admin/earnings)
 *  until they've actually submitted a packet — pass skipKycGate on that page
 *  itself to avoid redirecting to where it already is. Everything else about
 *  the Head's permissions is unaffected; this only nudges navigation.
 *
 *  KYC is checked BEFORE the subscription gate — by product design, buying a
 *  plan (BillingService.selfServeSubscribe) requires KYC to already be
 *  VERIFIED, so a Head who hasn't even submitted KYC yet should never be
 *  routed to "buy a plan" in the first place; they belong on the KYC screen.
 *  This ordering only became safe once the KYC endpoints themselves stopped
 *  being blocked by an inactive subscription (see settlements.controller.ts's
 *  bypassSubscriptionGate) — before that fix, checking KYC first would have
 *  silently gotten back null (a 403 swallowed by apiFetchServer) and
 *  misreported as "KYC not submitted" instead of the real reason. */
export async function getMeOrRedirect(
  locale: Locale,
  opts?: { skipKycGate?: boolean; skipSubscriptionGate?: boolean },
): Promise<MeResponse> {
  const cookieHeader = cookies().toString();
  const me = await apiFetchServer<MeResponse>('/auth/me', cookieHeader);
  if (!me || me.kind !== 'STAFF') redirect(`/${locale}/admin/login`);
  if (!opts?.skipKycGate && me.roleKeys.includes('ACADEMIC_HEAD') && me.orgId) {
    const kyc = await apiFetchServer<KycSubmissionView | null>('/academic/settlements/kyc', cookieHeader);
    // Also clears the gate when kycStatus is already VERIFIED even with no
    // kycSubmittedAt — e.g. an institute verified via the legacy one-click
    // Super Admin shortcut (pre self-service KYC) or a future pure-webhook
    // verification, neither of which ever calls submitKyc(). Only a Head who
    // is genuinely un-submitted and un-verified should be funneled here.
    const kycDone = !!kyc?.kycSubmittedAt || kyc?.kycStatus === 'VERIFIED';
    if (!kycDone) redirect(`/${locale}/admin/earnings?kycRequired=1`);
  }
  if (!opts?.skipSubscriptionGate && me.orgId && me.orgSubscriptionActive === false) {
    redirect(`/${locale}/admin/profile?subscriptionRequired=1`);
  }
  return me;
}
