import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe, initialsOf } from '@/lib/student';
import { PublicHeader } from '@/components/PublicHeader';
import { StudentShell } from '@/components/StudentShell';

export const dynamic = 'force-dynamic';

interface CurrentAffair {
  id: string;
  dateFor: string;
  titleHi: string;
  titleEn: string;
  bodyHi: string | null;
  bodyEn: string | null;
  category: string;
  scope: string;
}

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const title = hi ? 'करेंट अफेयर्स' : 'Current Affairs';
  const description = hi
    ? 'राष्ट्रीय व राज्य करेंट अफेयर्स — All Over India, नि:शुल्क, प्रतिदिन अद्यतन।'
    : 'National & state current affairs, All Over India — free, updated daily.';
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/current-affairs`,
      languages: { 'hi-IN': '/hi/current-affairs', 'en-IN': '/en/current-affairs', 'x-default': '/hi/current-affairs' },
    },
  };
}

export default async function CurrentAffairsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const [me, items] = await Promise.all([
    getMe(cookie),
    apiFetchServer<CurrentAffair[]>('/current-affairs', '').then((r) => r ?? []),
  ]);

  const list =
    items.length === 0 ? (
      <p className="mt-8 text-sm text-muted">{L('जल्द ही नए अपडेट आएँगे।', 'New updates coming soon.')}</p>
    ) : (
      <ul className="mt-6 grid gap-4">
        {items.map((c) => (
          <li key={c.id} className="rounded-lg border border-line bg-white p-5">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-navy-100 px-2 py-0.5 font-extrabold text-navy-900">{c.category}</span>
              <span className="rounded-full bg-teal-100 px-2 py-0.5 font-extrabold text-teal-600">{c.scope}</span>
              <span className="text-muted">{new Date(c.dateFor).toLocaleDateString(hi ? 'hi-IN' : 'en-IN')}</span>
            </div>
            <h2 className="text-lg font-black text-navy-900">{hi ? c.titleHi : c.titleEn}</h2>
            {(hi ? c.bodyHi : c.bodyEn) ? <p className="mt-1 text-sm text-ink">{hi ? c.bodyHi : c.bodyEn}</p> : null}
          </li>
        ))}
      </ul>
    );

  // Logged-in student → render inside the portal shell.
  if (me && me.kind === 'STUDENT') {
    return (
      <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={L('करंट अफेयर्स', 'Current Affairs')}>
        <div className="mb-2">
          <h1 className="text-[26px] font-black tracking-tight text-navy-950 md:text-[34px]">{L('करंट अफेयर्स', 'Current Affairs')}</h1>
          <p className="mt-1 text-sm text-muted">{L('परीक्षा-केंद्रित दैनिक अपडेट।', 'Exam-focused daily updates.')}</p>
        </div>
        {list}
      </StudentShell>
    );
  }

  // Public visitor → marketing header.
  return (
    <>
      <PublicHeader locale={locale} />
      <main id="main" className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-black text-navy-950">{L('करेंट अफेयर्स', 'Current Affairs')}</h1>
        <p className="mt-2 text-muted">{L('नि:शुल्क — बिना लॉगिन। परीक्षा-केंद्रित दैनिक अपडेट।', 'Free, no login. Exam-focused daily updates.')}</p>
        {list}
      </main>
    </>
  );
}
