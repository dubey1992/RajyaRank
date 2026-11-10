import type { Metadata } from 'next';
import { resolveLocale } from '@/lib/i18n';
import { PublicHeader } from '@/components/PublicHeader';
import { DemoRequestForm } from '@/components/DemoRequestForm';

export const dynamic = 'force-static';

// NEXT_PUBLIC_ deliberately, not WEB_PUBLIC_URL — see the comment in robots.ts.
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const title = hi ? 'डेमो का अनुरोध करें' : 'Request a demo';
  const description = hi
    ? 'अपने कोचिंग संस्थान, स्कूल या NGO के लिए RajyaRank का लाइव डेमो देखें।'
    : 'Request a live demo of RajyaRank for your coaching institute, school, or NGO.';
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/request-demo`,
      languages: { 'hi-IN': '/hi/request-demo', 'en-IN': '/en/request-demo', 'x-default': '/en/request-demo' },
    },
    openGraph: { type: 'website', title, description, url: `${SITE}/${locale}/request-demo`, images: [`${SITE}/opengraph-image`] },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default function RequestDemoPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  return (
    <>
      <PublicHeader locale={locale} />
      <main id="main" className="mx-auto max-w-2xl px-4 py-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-100 px-3 py-1.5 text-[13px] font-extrabold text-teal-600">
          {L('संस्थानों के लिए', 'For Institutions')}
        </span>
        <h1 className="mt-3 text-2xl font-black text-navy-950 md:text-3xl">{L('डेमो का अनुरोध करें', 'Request a demo')}</h1>
        <p className="mt-2 text-muted">
          {L(
            'अपने कोचिंग संस्थान, स्कूल या NGO के बारे में बताएं — हमारी टीम आपको RajyaRank का लाइव डेमो दिखाएगी और सवालों के जवाब देगी।',
            'Tell us about your coaching institute, school, or NGO — our team will walk you through a live demo of RajyaRank and answer any questions.',
          )}
        </p>
        <div className="mt-8">
          <DemoRequestForm locale={locale} />
        </div>
      </main>
    </>
  );
}
