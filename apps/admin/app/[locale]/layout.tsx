import type { ReactNode } from 'react';
import type { Metadata } from 'next';
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
      <body className={locale === 'hi' ? 'font-deva' : 'font-sans'}>{children}</body>
    </html>
  );
}
