import { SetMetadata } from '@nestjs/common';

export const ALLOW_SUSPENDED_ORG_KEY = 'rr:allowSuspendedOrg';
/** Narrow exception to AccessGuard's institution-suspended lockout — still
 *  requires authentication, just skips the orgActive check for this route.
 *  Reserved for the handful of routes a detached member needs to still
 *  reach: seeing why they're locked out (auth/me), signing out, and
 *  contacting support. Do not use this to carve out anything else — it
 *  defeats the whole point of suspending an institution. */
export const AllowSuspendedOrg = () => SetMetadata(ALLOW_SUSPENDED_ORG_KEY, true);
