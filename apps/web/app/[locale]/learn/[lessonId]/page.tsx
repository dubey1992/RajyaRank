import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe, initialsOf } from '@/lib/student';
import { StudentShell } from '@/components/StudentShell';
import { LessonPlayer } from './player';

export const dynamic = 'force-dynamic';

interface LessonDetail {
  lessonId: string;
  lessonType: string;
  freePreview: boolean;
  title: { hi?: string; en?: string };
  summary: { hi?: string; en?: string };
  accessible: boolean;
  progress: { status: string; percentComplete: number; videoPositionSeconds: number } | null;
  bookmarked: boolean;
}

export default async function LearnPage({ params }: { params: { locale: string; lessonId: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const me = await getMe(cookie);
  if (!me) redirect(`/${locale}/login`);
  const lesson = await apiFetchServer<LessonDetail>(`/student/lessons/${params.lessonId}`, cookie);
  if (!lesson) redirect(`/${locale}/login`);

  const title = (hi ? lesson.title.hi : lesson.title.en) ?? lesson.title.en ?? lesson.title.hi ?? '';
  const summary = (hi ? lesson.summary?.hi : lesson.summary?.en) ?? '';

  return (
    <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={L('पाठ', 'Lesson')}>
      {/* Breadcrumb */}
      <nav className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-muted">
        <Link href={`/${locale}/dashboard`} className="font-bold text-orange-600">{L('डैशबोर्ड', 'Dashboard')}</Link>
        <span>›</span>
        <Link href={`/${locale}/my-courses`} className="font-bold text-orange-600">{L('मेरे कोर्स', 'My Courses')}</Link>
        <span>›</span>
        <span className="truncate">{title}</span>
      </nav>

      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <h1 className="text-2xl font-black tracking-tight text-navy-950">{title}</h1>
        {lesson.freePreview ? (
          <span className="inline-flex self-start rounded-full bg-teal-100 px-2.5 py-1 text-[10px] font-black text-teal-600">{L('मुफ़्त प्रीव्यू', 'FREE PREVIEW')}</span>
        ) : null}
      </div>

      <LessonPlayer
        lessonId={lesson.lessonId}
        lessonType={lesson.lessonType}
        accessible={lesson.accessible}
        locale={locale}
        title={title}
        summary={summary}
        initialProgress={lesson.progress?.percentComplete ?? 0}
        initialBookmarked={lesson.bookmarked}
      />
    </StudentShell>
  );
}
