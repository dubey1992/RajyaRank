import type { SubscriptionStatus } from '@prisma/client';

/** Whether an institution's platform subscription currently grants access —
 *  true for a genuinely ACTIVE (paid) subscription, and for a TRIAL whose
 *  currentPeriodEnd hasn't passed yet. TRIALING (self-serve checkout pending),
 *  PAST_DUE, CANCELED, and an expired TRIAL all withhold access. Single
 *  source of truth for the three places that gate on subscription status:
 *  AuthorizationService.resolvePrincipal (feeds policy.engine's permission
 *  gate + the admin app's page-redirect gate), StudentsService.enroll, and
 *  InvitationsService.create. */
export function isSubscriptionUsable(status: SubscriptionStatus, currentPeriodEnd: Date | null): boolean {
  if (status === 'ACTIVE') return true;
  if (status === 'TRIAL') return !!currentPeriodEnd && currentPeriodEnd.getTime() > Date.now();
  return false;
}
