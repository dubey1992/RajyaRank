const STORAGE_KEY = 'rr_attribution';

export interface StoredAttribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrerHost?: string;
  landingPath?: string;
}

/** First-touch marketing attribution: captured once, on this browser's very
 *  first page view, and never overwritten after that — so a lead who reads
 *  three blog posts over a week before submitting the demo form still shows
 *  the channel that actually brought them in, not "direct" from their last
 *  internal navigation. Safe to call on every page; it no-ops once stored. */
export function captureAttributionOnce() {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(STORAGE_KEY)) return;

    const params = new URLSearchParams(window.location.search);
    const attribution: StoredAttribution = {
      utmSource: params.get('utm_source') || undefined,
      utmMedium: params.get('utm_medium') || undefined,
      utmCampaign: params.get('utm_campaign') || undefined,
      landingPath: window.location.pathname,
    };
    if (document.referrer) {
      try {
        attribution.referrerHost = new URL(document.referrer).host || undefined;
      } catch {
        // malformed referrer — leave unset rather than guess
      }
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // localStorage unavailable (private mode, blocked) — attribution is a
    // nice-to-have, never worth breaking the page over
  }
}

/** Reads the stored first-touch attribution for inclusion in a lead-form
 *  submission. Returns {} (not undefined fields) if nothing was ever
 *  captured, so callers can spread it directly into a payload. */
export function getStoredAttribution(): StoredAttribution {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAttribution) : {};
  } catch {
    return {};
  }
}
