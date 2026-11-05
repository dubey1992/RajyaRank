import type { Metadata } from 'next';
import { resolveLocale } from '@/lib/i18n';
import SignupClient from './SignupClient';

// NEXT_PUBLIC_ deliberately, not WEB_PUBLIC_URL — see the comment in robots.ts.
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const title = hi ? 'खाता बनाएँ' : 'Create your account';
  const description = hi
    ? 'RajyaRank पर मुफ़्त खाता बनाएँ और सरकारी परीक्षा की तैयारी शुरू करें।'
    : 'Create a free RajyaRank account and start your government exam preparation.';
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/signup`,
      languages: { 'hi-IN': '/hi/signup', 'en-IN': '/en/signup', 'x-default': '/hi/signup' },
    },
    openGraph: { type: 'website', title, description, url: `${SITE}/${locale}/signup`, images: [`${SITE}/opengraph-image`] },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default function SignupPage() {
  return <SignupClient />;
}
