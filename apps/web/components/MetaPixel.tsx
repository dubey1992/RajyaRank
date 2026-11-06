import Script from 'next/script';
import { headers } from 'next/headers';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/** Meta (Facebook) Pixel base code — production only, and only when
 *  NEXT_PUBLIC_META_PIXEL_ID is configured, mirroring GoogleAnalytics.tsx's
 *  contract exactly. The nonce comes from middleware.ts's per-request CSP
 *  (script-src uses 'strict-dynamic', no 'unsafe-inline'). */
export function MetaPixel() {
  if (process.env.NODE_ENV !== 'production' || !PIXEL_ID) return null;
  const nonce = headers().get('x-nonce') ?? undefined;
  return (
    <>
      <Script id="meta-pixel-init" strategy="afterInteractive" nonce={nonce}>
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');`}
      </Script>
      <noscript>
        <img height="1" width="1" style={{ display: 'none' }} src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`} alt="" />
      </noscript>
    </>
  );
}
