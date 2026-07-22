import Link from 'next/link';
import { Logo } from '@rajyarank/ui';
import { LanguageSwitch } from './LanguageSwitch';
import type { Locale } from '@/lib/i18n';

/** Shared header for every public/marketing page (landing, exams, courses,
 *  current affairs, pricing, search). One component so nav links, the mobile
 *  menu, and styling can never drift between pages again. The mobile menu uses
 *  a native <details>/<summary> disclosure — no client JS needed, so this can
 *  stay a server component and still work with JS disabled. */
export function PublicHeader({ locale, showInstitutesLink = false }: { locale: Locale; showInstitutesLink?: boolean }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  const navItems = [
    { href: `/${locale}/exams`, label: L('परीक्षाएँ', 'Exams') },
    { href: `/${locale}/courses`, label: L('कोर्स', 'Courses') },
    { href: `/${locale}#content`, label: L('अध्ययन सामग्री', 'Study content') },
    ...(showInstitutesLink ? [{ href: `/${locale}#institutes`, label: L('संस्थान', 'Institutes') }] : []),
    { href: `/${locale}#features`, label: L('विशेषताएँ', 'Features') },
    { href: `/${locale}/current-affairs`, label: L('करेंट अफेयर्स', 'Current Affairs') },
    { href: `/${locale}/blog`, label: L('ब्लॉग', 'Blog') },
    { href: `/${locale}#faq`, label: L('सामान्य प्रश्न', 'FAQ') },
    // Pricing is intentionally not linked from the header (hidden, not removed
    // — the /pricing route itself still works for anyone who reaches it directly).
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-line/90 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[72px] max-w-6xl items-center justify-between gap-4 px-4">
        <Link href={`/${locale}`} aria-label="RajyaRank" className="flex-none">
          <Logo size={38} />
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-bold text-navy-900 lg:flex" aria-label="Primary">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-orange-600">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <LanguageSwitch locale={locale} />
          <Link
            href={`/${locale}/login`}
            className="hidden rounded-xl border-[1.5px] border-orange-500/50 bg-white px-4 py-2 text-sm font-extrabold text-orange-600 transition hover:border-orange-500 sm:inline-flex"
          >
            {L('लॉगिन', 'Login')}
          </Link>
          <Link
            href={`/${locale}/signup`}
            className="hidden rounded-xl bg-orange-500 px-4 py-2 text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(249,115,22,0.22)] transition hover:bg-orange-600 sm:inline-flex"
          >
            {L('मुफ़्त शुरू करें', 'Start Free')}
          </Link>

          {/* Mobile menu — nav collapses under lg, so this is the only way to
             reach Exams/Courses/Current Affairs/etc. on phones/tablets. */}
          <details className="relative lg:hidden">
            <summary
              aria-label={L('मेनू खोलें', 'Open menu')}
              className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-line text-navy-900 [&::-webkit-details-marker]:hidden"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </summary>
            <div className="absolute right-0 top-[calc(100%+10px)] w-64 rounded-xl border border-line bg-white p-3 shadow-[0_14px_35px_rgba(15,23,42,0.12)]">
              <nav className="flex flex-col gap-0.5 text-sm font-bold text-navy-900" aria-label="Primary">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-md px-2 py-2 transition hover:bg-surface-soft hover:text-orange-600">
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="my-2 border-t border-line" />
              <div className="flex flex-col gap-2">
                <Link href={`/${locale}/login`} className="rounded-lg border-[1.5px] border-orange-500/50 px-3 py-2 text-center text-sm font-extrabold text-orange-600">
                  {L('लॉगिन', 'Login')}
                </Link>
                <Link href={`/${locale}/signup`} className="rounded-lg bg-orange-500 px-3 py-2 text-center text-sm font-extrabold text-white">
                  {L('मुफ़्त शुरू करें', 'Start Free')}
                </Link>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
