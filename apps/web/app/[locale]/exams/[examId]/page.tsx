import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe, initialsOf } from '@/lib/student';
import { PublicHeader } from '@/components/PublicHeader';
import { StudentShell } from '@/components/StudentShell';
import type { StateRef, ExamRef } from '@/components/ExamExplorer';

export const dynamic = 'force-dynamic';

interface CourseRef {
  id: string;
  code: string;
  titleHi: string;
  titleEn: string;
  stateId: string;
  examId: string;
}

export async function generateMetadata({ params }: { params: { locale: string; examId: string } }): Promise<Metadata> {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const exams = await apiFetchServer<ExamRef[]>('/exams', '');
  const exam = exams?.find((e) => e.id === params.examId);
  const nm = exam ? (hi ? exam.nameHi : exam.nameEn) : hi ? 'परीक्षा' : 'Exam';
  return {
    title: nm,
    description: hi ? `${nm} की तैयारी के लिए कोर्स और सिलेबस।` : `Courses and syllabus to prepare for ${nm}.`,
    alternates: {
      canonical: `/${locale}/exams/${params.examId}`,
      languages: {
        'hi-IN': `/hi/exams/${params.examId}`,
        'en-IN': `/en/exams/${params.examId}`,
        'x-default': `/hi/exams/${params.examId}`,
      },
    },
  };
}

export default async function ExamDetailPage({ params }: { params: { locale: string; examId: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const nm = (o: { nameHi: string; nameEn: string }) => (hi ? o.nameHi : o.nameEn);
  const cookie = cookies().toString();

  const [me, exams, courses, states] = await Promise.all([
    getMe(cookie),
    apiFetchServer<ExamRef[]>('/exams', ''),
    apiFetchServer<CourseRef[]>('/courses', ''),
    apiFetchServer<StateRef[]>('/states', ''),
  ]);
  const exam = exams?.find((e) => e.id === params.examId);
  if (!exam) notFound();
  const examCourses = (courses ?? []).filter((c) => c.examId === exam.id);
  const state = states?.find((s) => s.id === exam.stateId);
  const isStudent = !!me && me.kind === 'STUDENT';

  const content = (
    <>
      <nav className="mb-4 text-sm text-muted">
        <Link href={`/${locale}/exams`} className="hover:underline">{L('परीक्षाएँ', 'Exams')}</Link> / <span className="text-ink">{nm(exam)}</span>
      </nav>
      <div className="mb-1 text-xs font-extrabold uppercase text-orange-600">{exam.code}</div>
      <h1 className="text-3xl font-black text-navy-950">{nm(exam)}</h1>
      {state ? <p className="mt-1 text-muted">{nm(state)}</p> : null}

      <h2 className="mb-4 mt-8 text-xl font-black text-navy-900">{L('कोर्स', 'Courses')}</h2>
      {examCourses.length === 0 ? (
        <div className="rounded-lg border border-line bg-white p-6 text-sm text-muted">
          {isStudent
            ? L('इस परीक्षा के लिए कोर्स जल्द आ रहे हैं।', 'Courses for this exam are coming soon.')
            : L('इस परीक्षा के लिए कोर्स जल्द आ रहे हैं। नए कोर्स की सूचना पाने के लिए साइन अप करें।', 'Courses for this exam are coming soon. Sign up to be notified when they launch.')}
          {isStudent ? null : (
            <div className="mt-3">
              <Link href={`/${locale}/login`} className="rounded-md bg-orange-500 px-4 py-2 text-sm font-extrabold text-white">{L('साइन अप करें', 'Sign up')}</Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {examCourses.map((c) => (
            <Link
              key={c.id}
              href={`/${locale}/courses/${c.id}`}
              className="rounded-lg border border-line bg-white p-5 shadow-sm transition hover:border-orange-500 hover:shadow-md"
            >
              <div className="mb-1 text-xs font-extrabold uppercase text-teal-600">{c.code}</div>
              <div className="text-lg font-black text-navy-900">{hi ? c.titleHi : c.titleEn}</div>
              <div className="mt-3 text-sm font-extrabold text-navy-900">{L('कोर्स देखें →', 'View course →')}</div>
            </Link>
          ))}
        </div>
      )}
    </>
  );

  if (isStudent) {
    return (
      <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={nm(exam)}>
        {content}
      </StudentShell>
    );
  }

  return (
    <>
      <PublicHeader locale={locale} />
      <main id="main" className="mx-auto max-w-5xl px-4 py-10">{content}</main>
    </>
  );
}
