import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import type { StudentCourseDetail } from '@rajyarank/contracts';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe, initialsOf } from '@/lib/student';
import { StudentShell } from '@/components/StudentShell';
import { CourseCurriculumPanel } from '@/components/CourseCurriculumPanel';
import { CourseProgressCard } from '@/components/CourseProgressCard';

export const dynamic = 'force-dynamic';

export default async function EnrolledCoursePage({ params }: { params: { locale: string; courseId: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const me = await getMe(cookie);
  if (!me) redirect(`/${locale}/login`);
  const course = await apiFetchServer<StudentCourseDetail>(`/student/courses/${params.courseId}/curriculum`, cookie);
  if (!course) notFound();

  const title = hi ? course.titleHi : course.titleEn;
  const desc = (hi ? course.descHi : course.descEn) ?? '';

  return (
    <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={title}>
      <nav className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-muted">
        <Link href={`/${locale}/my-courses`} className="font-bold text-orange-600">{L('मेरे कोर्स', 'My Courses')}</Link>
        <span>›</span>
        <span className="truncate">{title}</span>
      </nav>

      <div className="grid gap-[18px] lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="grid gap-[18px]">
          {/* Banner */}
          <article className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-navy-950 to-navy-700 p-6 text-white">
            <span aria-hidden className="pointer-events-none absolute -right-36 -top-40 h-[360px] w-[360px] rounded-full border-[70px] border-white/[0.035]" />
            <div className="relative">
              <h1 className="text-[28px] font-black leading-tight tracking-tight">{title}</h1>
              {desc ? <p className="mt-2.5 max-w-2xl text-[12px] text-[#c7d8e2]">{desc}</p> : null}
              <div className="mt-5 flex flex-wrap gap-4 text-[10.5px] text-[#d8e5ec]">
                <span>▶ {course.lessonsTotal} {L('पाठ', 'lessons')}</span>
                <span>✓ {course.lessonsCompleted} {L('पूर्ण', 'completed')}</span>
                <span>📈 {course.percentComplete}% {L('प्रगति', 'progress')}</span>
              </div>
            </div>
          </article>

          <CourseCurriculumPanel course={course} locale={locale} />
        </div>

        {/* Side */}
        <aside className="grid content-start gap-[16px]">
          <CourseProgressCard course={course} locale={locale} />
          <article className="rounded-[20px] border border-line bg-white p-5">
            <h3 className="text-sm font-black text-navy-950">{L('मदद चाहिए?', 'Need help?')}</h3>
            <p className="mt-1 text-[11px] text-muted">{L('इस कोर्स से जुड़ा सवाल पूछें।', 'Ask a course-related doubt.')}</p>
            <Link href={`/${locale}/doubts`} className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-line bg-white px-4 py-2.5 text-[11px] font-extrabold text-navy-900 transition hover:bg-surface-soft">❓ {L('डाउट पूछें', 'Ask a doubt')}</Link>
          </article>
        </aside>
      </div>
    </StudentShell>
  );
}
