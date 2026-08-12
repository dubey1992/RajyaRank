const REF_COOKIE = 'rr_ref';

/** Reads the first-touch institute referral code middleware.ts captured
 *  from ?ref=... on any earlier page, for attaching to a signup request.
 *  undefined if no referral is active for this browser. */
export function getReferralCode(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${REF_COOKIE}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}
