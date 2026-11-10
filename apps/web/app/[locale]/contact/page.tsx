import type { Metadata } from 'next';
import { resolveLocale } from '@/lib/i18n';
import { PublicHeader } from '@/components/PublicHeader';
import { ContactForm } from '@/components/ContactForm';

export const dynamic = 'force-static';

// NEXT_PUBLIC_ deliberately, not WEB_PUBLIC_URL — see the comment in robots.ts.
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const title = hi ? 'संपर्क करें' : 'Contact us';
  const description = hi
    ? 'प्रश्न, संस्थान साझेदारी या सहायता के लिए RajyaRank से संपर्क करें।'
    : 'Questions, institution partnerships, or support — get in touch with RajyaRank.';
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/contact`,
      languages: { 'hi-IN': '/hi/contact', 'en-IN': '/en/contact', 'x-default': '/en/contact' },
    },
    openGraph: { type: 'website', title, description, url: `${SITE}/${locale}/contact`, images: [`${SITE}/opengraph-image`] },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default function ContactPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  return (
    <>
      <PublicHeader locale={locale} />
      <main id="main" className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-black text-navy-950 md:text-3xl">{L('संपर्क करें', 'Contact us')}</h1>
        <p className="mt-2 text-muted">
          {L(
            'प्रश्न, संस्थान साझेदारी या सहायता के लिए हमें लिखें — हम जल्द जवाब देंगे।',
            'Questions, institution partnerships, or support — write to us and we will get back to you soon.',
          )}
        </p>
        <div className="mt-8">
          <ContactForm locale={locale} />
        </div>
      </main>
    </>
  );
}
