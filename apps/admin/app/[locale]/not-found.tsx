import Link from 'next/link';
import { headers } from 'next/headers';
import { Logo } from '@rajyarank/ui';
import { resolveLocale } from '@/lib/i18n';

// Deliberately does not use Shell (which requires an authenticated `me`) —
// a broken/stale link can 404 before or without a session existing.
export default function NotFound() {
  // See apps/web/app/[locale]/not-found.tsx's comment — not-found.tsx gets
  // no route params, so the real locale comes from middleware's x-pathname
  // header instead of an unconditional default.
  const pathname = headers().get('x-pathname') ?? '';
  const locale = resolveLocale(pathname.split('/')[1]);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        background:
          'radial-gradient(circle at 90% 0, rgba(249,115,22,0.08), transparent 28%), radial-gradient(circle at 0 100%, rgba(15,139,120,0.08), transparent 32%), #f6f9fb',
      }}
    >
      <header className="sticky top-0 z-20 flex h-[72px] items-center border-b border-line bg-white/95 px-5 backdrop-blur-xl sm:px-7">
        <Logo size={40} />
      </header>
      <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <span className="text-5xl font-black tracking-tight text-navy-100 md:text-7xl" aria-hidden>
          4<span className="text-orange-500">0</span>4
        </span>
        <h1 className="mt-4 text-xl font-black text-navy-950 md:text-2xl">
          {L('यह पृष्ठ नहीं मिला', 'This page could not be found')}
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted">
          {L(
            'हो सकता है लिंक पुराना हो या आपके पास इस पृष्ठ की अनुमति न हो।',
            'The link may be outdated, or you may not have permission for this page.',
          )}
        </p>
        <Link
          href={`/${locale}/admin/dashboard`}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-3 font-extrabold text-white shadow-[0_10px_24px_rgba(249,115,22,0.28)] transition hover:-translate-y-0.5 hover:bg-orange-600"
        >
          {L('डैशबोर्ड पर जाएँ', 'Go to dashboard')}
        </Link>
      </main>
    </div>
  );
}
