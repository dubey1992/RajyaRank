import type { ReactNode } from 'react';
import { PublicHeader } from './PublicHeader';
import type { Locale } from '@/lib/i18n';

export function LegalPageLayout({
  locale,
  titleHi,
  titleEn,
  updatedOn,
  children,
}: {
  locale: Locale;
  titleHi: string;
  titleEn: string;
  updatedOn: string;
  children: ReactNode;
}) {
  const hi = locale === 'hi';
  return (
    <>
      <PublicHeader locale={locale} />
      <main id="main" className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-black text-navy-950 md:text-3xl">{hi ? titleHi : titleEn}</h1>
        <p className="mt-1 text-sm text-muted">{hi ? `अंतिम अद्यतन: ${updatedOn}` : `Last updated: ${updatedOn}`}</p>
        <div className="mt-8 [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-extrabold [&_h2]:text-navy-900 [&_p]:mb-3 [&_p]:leading-relaxed [&_p]:text-ink [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_li]:leading-relaxed [&_li]:text-ink">
          {children}
        </div>
        <div className="mt-10 border-t border-line pt-6 text-xs leading-relaxed text-muted">
          <p>{hi ? 'विकसित द्वारा' : 'Developed by'} <strong className="text-ink">NEXTWEBGEN INFOTECH PRIVATE LIMITED</strong></p>
          <p className="mt-1">
            Oakwood Estate Akashneem Marg, OE-410, Oakwood Estate Condominium Association, DLF City Phase-II, Gurgaon, Haryana 122002, India
          </p>
          <p className="mt-1">GSTIN: 06AAHCN3398J1Z0</p>
        </div>
      </main>
    </>
  );
}
