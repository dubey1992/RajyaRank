import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe, initialsOf } from '@/lib/student';
import { PublicHeader } from '@/components/PublicHeader';
import { StudentShell } from '@/components/StudentShell';
import { ExamExplorer, type StateRef, type ExamRef } from '@/components/ExamExplorer';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const title = hi ? 'परीक्षाएँ खोजें' : 'Explore exams';
  const description = hi
    ? 'All Over India की सरकारी परीक्षाएँ और उनके कोर्स खोजें।'
    : 'Explore government exams from All Over India and their preparation courses.';
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/exams`,
      languages: { 'hi-IN': '/hi/exams', 'en-IN': '/en/exams', 'x-default': '/hi/exams' },
    },
  };
}

export default async function ExamsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const [me, states, exams] = await Promise.all([
    getMe(cookie),
    apiFetchServer<StateRef[]>('/states', ''),
    apiFetchServer<ExamRef[]>('/exams', ''),
  ]);

  const heading = L('परीक्षाएँ खोजें', 'Explore exams');
  const explorer = <ExamExplorer states={states ?? []} exams={exams ?? []} locale={locale} />;

  // Logged-in student → stay inside the portal shell (no public login CTAs).
  if (me && me.kind === 'STUDENT') {
    return (
      <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={L('कोर्स खोजें', 'Explore courses')}>
        <div className="mb-6">
          <h1 className="text-[26px] font-black tracking-tight text-navy-950 md:text-[34px]">{heading}</h1>
          <p className="mt-1 text-sm text-muted">{L('अपनी लक्षित परीक्षा चुनें और उसके कोर्स, सिलेबस व अभ्यास देखें।', 'Pick your target exam and browse its courses, syllabus and practice.')}</p>
        </div>
        {explorer}
      </StudentShell>
    );
  }

  // Public visitor → marketing header.
  return (
    <>
      <PublicHeader locale={locale} />
      <main id="main" className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-black text-navy-950">{heading}</h1>
        <p className="mt-2 max-w-2xl text-muted">
          {L('अपनी लक्षित परीक्षा चुनें और उसके कोर्स, सिलेबस व अभ्यास देखें — बिना लॉगिन।', 'Pick your target exam and browse its courses, syllabus, and practice — no login required.')}
        </p>
        <div className="mt-8">{explorer}</div>
      </main>
    </>
  );
}
