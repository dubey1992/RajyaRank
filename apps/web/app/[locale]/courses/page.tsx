import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe, initialsOf } from '@/lib/student';
import { PublicHeader } from '@/components/PublicHeader';
import { StudentShell } from '@/components/StudentShell';
import { CoursesFilterGrid } from '@/components/CoursesFilterGrid';
import { toFilterableCourses, type CourseListItem } from '@/lib/courses';
import type { ProductView, State, Exam } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const title = hi ? 'सभी कोर्स' : 'All courses';
  const description = hi
    ? 'सभी उपलब्ध कोर्स खोजें, फ़िल्टर करें और सीधे खरीदें।'
    : 'Browse, filter, and buy any available course directly.';
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/courses`,
      languages: { 'hi-IN': '/hi/courses', 'en-IN': '/en/courses', 'x-default': '/hi/courses' },
    },
  };
}

export default async function AllCoursesPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const [me, courseList, products, states, exams] = await Promise.all([
    getMe(cookie),
    apiFetchServer<CourseListItem[]>('/courses', ''),
    apiFetchServer<ProductView[]>('/products', ''),
    apiFetchServer<State[]>('/states', ''),
    apiFetchServer<Exam[]>('/exams', ''),
  ]);
  const courses = toFilterableCourses(courseList ?? [], products ?? []);

  const heading = L('सभी कोर्स', 'All courses');
  const grid = <CoursesFilterGrid courses={courses} states={states ?? []} exams={exams ?? []} locale={locale} mode="buy" />;

  if (me && me.kind === 'STUDENT') {
    return (
      <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={heading}>
        <div className="mb-6">
          <h1 className="text-[26px] font-black tracking-tight text-navy-950 md:text-[34px]">{heading}</h1>
          <p className="mt-1 text-sm text-muted">{L('फ़िल्टर करें और सीधे खरीदें।', 'Filter and buy directly.')}</p>
        </div>
        {grid}
      </StudentShell>
    );
  }

  return (
    <>
      <PublicHeader locale={locale} />
      <main id="main" className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-black text-navy-950">{heading}</h1>
        <p className="mt-2 max-w-2xl text-muted">
          {L('सभी उपलब्ध कोर्स खोजें, फ़िल्टर करें और सीधे यहीं से खरीदें।', 'Browse all available courses, filter them, and buy right here.')}
        </p>
        <div className="mt-8">{grid}</div>
      </main>
    </>
  );
}
