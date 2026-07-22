import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe, initialsOf } from '@/lib/student';
import { PublicHeader } from '@/components/PublicHeader';
import { StudentShell } from '@/components/StudentShell';

export const dynamic = 'force-dynamic';

interface ExamR { id: string; code: string; nameHi: string; nameEn: string; stateId: string | null }
interface CourseR { id: string; code: string; titleHi: string; titleEn: string; examId: string }
interface Results { exams: ExamR[]; courses: CourseR[] }

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const hi = resolveLocale(params.locale) === 'hi';
  return { title: hi ? 'खोज' : 'Search', robots: { index: false } };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { q?: string };
}) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();
  const q = (searchParams.q ?? '').toString();

  const me = await getMe(cookie);
  const results =
    q.trim().length >= 2
      ? (await apiFetchServer<Results>(`/search?q=${encodeURIComponent(q)}`, '')) ?? { exams: [], courses: [] }
      : { exams: [], courses: [] };
  const total = results.exams.length + results.courses.length;
  const isStudent = !!me && me.kind === 'STUDENT';

  const content = (
    <>
      <h1 className="text-2xl font-black text-navy-950">{L('खोज', 'Search')}</h1>
      <form action={`/${locale}/search`} method="get" role="search" className="mt-4 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          autoFocus
          placeholder={L('परीक्षाएँ, कोर्स खोजें…', 'Search exams, courses…')}
          className="w-full rounded-md border border-line px-3 py-2 outline-none focus:border-orange-500"
        />
        <button type="submit" className="rounded-md bg-orange-500 px-5 py-2 font-extrabold text-white">{L('खोजें', 'Search')}</button>
      </form>

      {q.trim().length < 2 ? (
        <p className="mt-6 text-sm text-muted">{L('खोजने के लिए कम से कम 2 अक्षर लिखें।', 'Type at least 2 characters to search.')}</p>
      ) : total === 0 ? (
        <p className="mt-6 text-sm text-muted">{L(`“${q}” के लिए कोई परिणाम नहीं मिला।`, `No results for “${q}”.`)}</p>
      ) : (
        <div className="mt-6 grid gap-6">
          {results.exams.length ? (
            <section>
              <h2 className="mb-2 text-sm font-black uppercase text-muted">{L('परीक्षाएँ', 'Exams')}</h2>
              <ul className="grid gap-2">
                {results.exams.map((e) => (
                  <li key={e.id}>
                    <Link href={`/${locale}/exams/${e.id}`} className="flex items-center justify-between rounded-md border border-line bg-white px-4 py-3 hover:border-orange-500">
                      <span className="font-bold text-navy-900">{hi ? e.nameHi : e.nameEn}</span>
                      <span className="text-xs font-extrabold text-orange-600">{e.code}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {results.courses.length ? (
            <section>
              <h2 className="mb-2 text-sm font-black uppercase text-muted">{L('कोर्स', 'Courses')}</h2>
              <ul className="grid gap-2">
                {results.courses.map((c) => (
                  <li key={c.id}>
                    <Link href={`/${locale}/courses/${c.id}`} className="flex items-center justify-between rounded-md border border-line bg-white px-4 py-3 hover:border-orange-500">
                      <span className="font-bold text-navy-900">{hi ? c.titleHi : c.titleEn}</span>
                      <span className="text-xs font-extrabold text-teal-600">{c.code}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </>
  );

  if (isStudent) {
    return (
      <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={L('खोज', 'Search')}>
        {content}
      </StudentShell>
    );
  }

  return (
    <>
      <PublicHeader locale={locale} />
      <main id="main" className="mx-auto max-w-4xl px-4 py-10">{content}</main>
    </>
  );
}
