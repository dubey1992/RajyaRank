import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Devanagari } from 'next/font/google';
import NextTopLoader from 'nextjs-toploader';
import { resolveLocale, getT } from '@/lib/i18n';
import { RegisterSW } from '@/components/RegisterSW';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import '@rajyarank/ui/styles.css';
import './globals.css';

// NEXT_PUBLIC_ deliberately, not WEB_PUBLIC_URL — see the comment in robots.ts.
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// Self-hosted at build time (no runtime request to fonts.googleapis.com, no
// layout shift) — previously the site only ever *referenced* 'Inter' and
// 'Noto Sans Devanagari' by name in CSS with nothing actually loading them,
// so every visitor silently got system-font fallbacks the whole time.
const inter = Inter({ subsets: ['latin'], weight: 'variable', variable: '--font-inter', display: 'swap' });
const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: 'variable',
  variable: '--font-noto-deva',
  display: 'swap',
});

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const description = hi
    ? 'All Over India के सरकारी परीक्षा की तैयारी — हिंदी-पहले, द्विभाषी।'
    : 'Bilingual government-exam preparation, All Over India.';
  return {
    metadataBase: new URL(SITE),
    title: { default: 'RajyaRank', template: '%s · RajyaRank' },
    description,
    manifest: '/manifest.webmanifest',
    icons: { icon: '/icon.svg' },
    alternates: {
      canonical: `/${locale}`,
      languages: { 'hi-IN': '/hi', 'en-IN': '/en', 'x-default': '/en' },
    },
    openGraph: {
      type: 'website',
      siteName: 'RajyaRank',
      locale: hi ? 'hi_IN' : 'en_IN',
      url: `${SITE}/${locale}`,
      title: 'RajyaRank',
      description,
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#0b2f4f',
};

export default function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const locale = resolveLocale(params.locale);
  const t = getT(locale);
  // translate="no": the platform is genuinely bilingual, never machine-translated.
  return (
    <html lang={locale} translate="no" className={`${inter.variable} ${notoSansDevanagari.variable}`}>
      <body className={locale === 'hi' ? 'font-deva' : 'font-sans'}>
        {/* Progress bar during page transitions — most pages are SSR'd
            (force-dynamic + server-side data fetches), which otherwise gave no
            feedback between clicking a link and the next page appearing. */}
        <NextTopLoader color="#f97316" showSpinner={false} height={3} shadow="0 0 10px #f97316,0 0 5px #f97316" />
        <a href="#main" className="rr-visually-hidden">
          {t('common.appName')}
        </a>
        {children}
        <RegisterSW />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
