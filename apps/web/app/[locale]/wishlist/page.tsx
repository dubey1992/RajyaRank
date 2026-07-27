import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe, initialsOf } from '@/lib/student';
import { StudentShell } from '@/components/StudentShell';
import { CoursesFilterGrid } from '@/components/CoursesFilterGrid';
import { toFilterableCourses, type CourseListItem } from '@/lib/courses';
import type { ProductView, State, Exam } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  return { title: hi ? 'विशलिस्ट' : 'Wishlist' };
}

export default async function WishlistPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const me = await getMe(cookie);
  if (!me || me.kind !== 'STUDENT') redirect(`/${locale}/login`);

  const [courseList, products, states, exams] = await Promise.all([
    apiFetchServer<CourseListItem[]>('/student/wishlist', cookie),
    apiFetchServer<ProductView[]>('/products', ''),
    apiFetchServer<State[]>('/states', ''),
    apiFetchServer<Exam[]>('/exams', ''),
  ]);
  const courses = toFilterableCourses(courseList ?? [], products ?? []);
  const heading = L('मेरी विशलिस्ट', 'My Wishlist');

  return (
    <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={heading}>
      <div className="mb-6">
        <h1 className="text-[26px] font-black tracking-tight text-navy-950 md:text-[34px]">{heading}</h1>
        <p className="mt-1 text-sm text-muted">{L('बाद में खरीदने के लिए सहेजे गए कोर्स।', 'Courses you saved to buy later.')}</p>
      </div>
      {courses.length === 0 ? (
        <div className="rounded-[18px] border border-line bg-white p-10 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[20px] bg-surface-soft text-2xl">♡</div>
          <h3 className="mt-3.5 text-[15px] font-black text-navy-900">{L('विशलिस्ट खाली है', 'Your wishlist is empty')}</h3>
          <p className="mt-1 text-[10.5px] text-muted">{L('किसी कोर्स पर ♡ दबाकर उसे यहाँ सहेजें।', 'Tap ♡ on any course to save it here.')}</p>
        </div>
      ) : (
        <CoursesFilterGrid courses={courses} states={states ?? []} exams={exams ?? []} locale={locale} mode="buy" isStudent />
      )}
    </StudentShell>
  );
}
