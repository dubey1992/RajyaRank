import Link from 'next/link';
import { LogoMark } from '@rajyarank/ui';
import { resolveLocale } from '@/lib/i18n';
import { TestRunner } from './runner';

export const dynamic = 'force-dynamic';

// Distraction-free test surface (no sidebar shell) — keep the student focused
// on the attempt; a minimal top bar offers a deliberate exit.
export default function TestAttemptPage({ params }: { params: { locale: string; testVersionId: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  return (
    <div className="min-h-screen bg-surface-soft">
      <header className="sticky top-0 z-20 flex h-[64px] items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur-xl sm:px-7">
        <div className="flex items-center gap-2.5"><LogoMark size={34} /><span className="text-lg font-black tracking-tight text-navy-950">Rajya<span className="text-orange-500">Rank</span></span></div>
        <Link href={`/${locale}/tests`} className="rounded-xl border border-line bg-white px-3.5 py-2 text-[11px] font-extrabold text-navy-900 transition hover:bg-surface-soft">
          {hi ? 'बाहर निकलें' : 'Exit test'}
        </Link>
      </header>
      <main id="main" className="mx-auto max-w-[1180px] px-4 py-6 sm:px-7">
        <TestRunner testVersionId={params.testVersionId} locale={locale} />
      </main>
    </div>
  );
}
