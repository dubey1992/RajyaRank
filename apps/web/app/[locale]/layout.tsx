import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import NextTopLoader from 'nextjs-toploader';
import { resolveLocale, getT } from '@/lib/i18n';
import { RegisterSW } from '@/components/RegisterSW';
import '@rajyarank/ui/styles.css';
import './globals.css';

const SITE = process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000';

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
      languages: { 'hi-IN': '/hi', 'en-IN': '/en', 'x-default': '/hi' },
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
    <html lang={locale} translate="no">
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
      </body>
    </html>
  );
}
