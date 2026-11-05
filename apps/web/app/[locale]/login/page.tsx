import type { Metadata } from 'next';
import { resolveLocale } from '@/lib/i18n';
import LoginClient from './LoginClient';

// NEXT_PUBLIC_ deliberately, not WEB_PUBLIC_URL — see the comment in robots.ts.
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const title = hi ? 'साइन इन करें' : 'Sign in';
  const description = hi
    ? 'RajyaRank में छात्र या स्टाफ़ के रूप में साइन इन करें।'
    : 'Sign in to RajyaRank as a student or staff member.';
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/login`,
      languages: { 'hi-IN': '/hi/login', 'en-IN': '/en/login', 'x-default': '/hi/login' },
    },
    openGraph: { type: 'website', title, description, url: `${SITE}/${locale}/login`, images: [`${SITE}/opengraph-image`] },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default function LoginPage() {
  return <LoginClient />;
}
