import Link from 'next/link';
import { headers } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { PublicHeader } from '@/components/PublicHeader';

// Next.js App Router convention: this renders for any unmatched route under
// [locale] (including calls to next/navigation's notFound()) — locale-aware
// so a broken link never drops a visitor into an English-only dead end.
export default function NotFound() {
  // not-found.tsx does not receive route params, so the locale can't be
  // resolved from params.locale here — read the path middleware.ts stamped
  // onto the request instead (see its x-pathname header) rather than
  // silently defaulting to 'hi' regardless of which locale was requested.
  const pathname = headers().get('x-pathname') ?? '';
  const locale = resolveLocale(pathname.split('/')[1]);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  return (
    <>
      <PublicHeader locale={locale} />
      <main id="main" className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center md:py-28">
        <span className="text-6xl font-black tracking-tight text-navy-100 md:text-8xl" aria-hidden>
          4<span className="text-orange-500">0</span>4
        </span>
        <h1 className="mt-4 text-2xl font-black text-navy-950 md:text-3xl">
          {L('यह पृष्ठ नहीं मिला', 'This page could not be found')}
        </h1>
        <p className="mt-3 max-w-md text-muted">
          {L(
            'हो सकता है लिंक पुराना हो या पता गलत टाइप हो गया हो। नीचे दिए गए विकल्पों से आगे बढ़ें।',
            'The link may be outdated, or the address may have been mistyped. Try one of the options below.',
          )}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-3 font-extrabold text-white shadow-[0_10px_24px_rgba(249,115,22,0.28)] transition hover:-translate-y-0.5 hover:bg-orange-600"
          >
            {L('होमपेज पर जाएँ', 'Go to homepage')}
          </Link>
          <Link
            href={`/${locale}/courses`}
            className="inline-flex items-center justify-center rounded-xl border border-line px-5 py-3 font-extrabold text-navy-900 transition hover:-translate-y-0.5 hover:bg-surface-soft"
          >
            {L('कोर्स देखें', 'Browse courses')}
          </Link>
          <Link
            href={`/${locale}/contact`}
            className="inline-flex items-center justify-center rounded-xl border border-line px-5 py-3 font-extrabold text-navy-900 transition hover:-translate-y-0.5 hover:bg-surface-soft"
          >
            {L('सहायता चाहिए?', 'Need help?')}
          </Link>
        </div>
      </main>
    </>
  );
}
