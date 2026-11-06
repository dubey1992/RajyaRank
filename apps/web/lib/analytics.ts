declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

/** Fires a GA4 event when gtag is loaded (production only — see GoogleAnalytics.tsx).
 *  No-ops silently in dev/staging or if GA hasn't initialized yet, so callers
 *  never need to guard for that themselves. Never pass PII (name/email/phone)
 *  in params — GA4's terms prohibit it. */
export function trackEvent(name: string, params?: Record<string, string | number | boolean>) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

/** Meta's own browser cookies, set once the Pixel (MetaPixel.tsx) loads —
 *  forwarded to the server so a Conversions API event matches back to the
 *  same browser the Pixel (if it ran) also reported. Absent when the Pixel
 *  hasn't loaded yet (first page, slow network) or isn't configured — every
 *  caller already treats these as optional. */
export function getFacebookBrowserIds(): { fbp?: string; fbc?: string } {
  return { fbp: readCookie('_fbp'), fbc: readCookie('_fbc') };
}

/** One id per real action, shared between the client-side fbq() call and the
 *  matching server-side Conversions API call, so Meta dedupes the two
 *  reports of the same event instead of double-counting it. */
export function newEventId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Fires a Meta Pixel standard event when fbq is loaded (production only —
 *  see MetaPixel.tsx). No-ops silently otherwise, same contract as
 *  trackEvent above. `eventId` must be the one passed to the paired
 *  Conversions API call for this exact action (see newEventId). */
export function trackPixelEvent(name: string, eventId: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  window.fbq('track', name, params ?? {}, { eventID: eventId });
}
