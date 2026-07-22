import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { KycSubmissionView, MeResponse } from '@rajyarank/contracts';
import { apiFetchServer } from './api';
import type { Locale } from './i18n';

/** Server-side gate for admin pages: returns the staff principal or redirects.
 *  Also funnels an Academic Head to the KYC submission screen (/admin/earnings)
 *  until they've actually submitted a packet — pass skipKycGate on that page
 *  itself to avoid redirecting to where it already is. Everything else about
 *  the Head's permissions is unaffected; this only nudges navigation. */
export async function getMeOrRedirect(locale: Locale, opts?: { skipKycGate?: boolean }): Promise<MeResponse> {
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
  return me;
}
