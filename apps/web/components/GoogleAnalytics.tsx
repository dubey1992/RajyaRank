import Script from 'next/script';
import { headers } from 'next/headers';

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/** GA4 (gtag.js) — production only, and only when NEXT_PUBLIC_GA_MEASUREMENT_ID
 *  is configured, so local dev and any environment without the env var set
 *  never sends events into production analytics. The nonce comes from
 *  middleware.ts's per-request CSP (script-src uses 'strict-dynamic', no
 *  'unsafe-inline'), so both the loader and the inline config script need it
 *  to be allowed to execute. */
export function GoogleAnalytics() {
  if (process.env.NODE_ENV !== 'production' || !GA_ID) return null;
  const nonce = headers().get('x-nonce') ?? undefined;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" nonce={nonce} />
      <Script id="ga4-init" strategy="afterInteractive" nonce={nonce}>
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
