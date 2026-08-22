declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
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
