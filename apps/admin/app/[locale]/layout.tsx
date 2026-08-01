import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import NextTopLoader from 'nextjs-toploader';
import { resolveLocale } from '@/lib/i18n';
import '@rajyarank/ui/styles.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'RajyaRank Admin',
  robots: { index: false, follow: false }, // staff portal is never indexed
};

export default function AdminLocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const locale = resolveLocale(params.locale);
  return (
    <html lang={locale} translate="no">
      <body className={locale === 'hi' ? 'font-deva' : 'font-sans'}>
        {/* Progress bar during page/menu transitions — SSR pages (getMeOrRedirect +
            data fetches) have no other in-flight indicator, so switching sidebar
            items looked frozen until the new page finished loading. */}
        <NextTopLoader color="#f97316" showSpinner={false} height={3} shadow="0 0 10px #f97316,0 0 5px #f97316" />
        {children}
      </body>
    </html>
  );
}
