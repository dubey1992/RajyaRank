import Link from 'next/link';
import type { StudentCourseDetail } from '@rajyarank/contracts';

const CIRC = 2 * Math.PI * 54;

/** Progress ring + resume/enrol CTA. Shared by the real "My Courses" course
 *  page and the Course Studio's "Open student preview" (sample progress). */
export function CourseProgressCard({ course, locale }: { course: StudentCourseDetail; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const allLessons = course.modules.flatMap((m) => m.lessons);
  const resume = allLessons.find((l) => l.accessible && l.status === 'IN_PROGRESS') ?? allLessons.find((l) => l.accessible && l.status === 'NONE') ?? allLessons.find((l) => l.accessible);

  return (
    <article className="rounded-[20px] border border-line bg-white p-5 text-center shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
      <h3 className="text-left text-sm font-black text-navy-950">{L('कोर्स प्रगति', 'Course progress')}</h3>
      <div className="relative mx-auto my-3 h-[125px] w-[125px]">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="54" fill="none" strokeWidth="11" stroke="#edf3f6" />
          <circle cx="60" cy="60" r="54" fill="none" strokeWidth="11" strokeLinecap="round" stroke="#f57417" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - course.percentComplete / 100)} />
        </svg>
        <div className="absolute inset-0 grid place-content-center">
          <strong className="text-[28px] font-black tracking-tighter text-navy-950">{course.percentComplete}%</strong>
          <span className="text-[9px] font-black text-muted">{L('पूर्ण', 'COMPLETED')}</span>
        </div>
      </div>
      {resume ? (
        <Link href={`/${locale}/learn/${resume.lessonId}`} className="block w-full rounded-xl bg-orange-500 py-2.5 text-center text-[11px] font-extrabold text-white transition hover:bg-orange-600">▶ {L('पाठ जारी रखें', 'Continue lesson')}</Link>
      ) : (
        <Link href={`/${locale}/pricing`} className="block w-full rounded-xl bg-orange-500 py-2.5 text-center text-[11px] font-extrabold text-white">{L('नामांकन करें', 'Enrol')}</Link>
      )}
    </article>
  );
}
