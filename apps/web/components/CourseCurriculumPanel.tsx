import Link from 'next/link';
import type { StudentCourseDetail, StudentCourseLesson } from '@rajyarank/contracts';

function lessonIcon(l: StudentCourseLesson): string {
  if (!l.accessible) return '🔒';
  if (l.status === 'COMPLETED') return '✓';
  if (l.lessonType === 'DOCUMENT' || l.lessonType === 'PDF') return '📄';
  if (l.lessonType === 'QUIZ' || l.lessonType === 'TEST') return '📝';
  return '▶';
}

/** Enrolled-student curriculum view — Subject accordion with per-lesson
 *  status/action. Shared by the real "My Courses" course page and the Course
 *  Studio's "Open student preview" (which feeds it sample, never-real
 *  progress instead of a real student's). */
export function CourseCurriculumPanel({ course, locale }: { course: StudentCourseDetail; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  return (
    <article className="overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
      <div className="flex items-center justify-between gap-3 border-b border-line p-5">
        <div>
          <h2 className="text-lg font-black tracking-tight text-navy-950">{L('पाठ्यक्रम', 'Course curriculum')}</h2>
          <p className="text-[11px] text-muted">{course.lessonsCompleted} {L('/', 'of')} {course.lessonsTotal} {L('पाठ पूर्ण', 'lessons completed')}</p>
        </div>
      </div>
      {course.modules.length === 0 ? (
        <p className="p-5 text-sm text-muted">{L('पाठ्यक्रम जल्द जोड़ा जाएगा।', 'Curriculum will be added soon.')}</p>
      ) : (
        course.modules.map((m, mi) => (
          <details key={m.subjectId} open={mi === 0} className="group border-b border-line last:border-0">
            <summary className="flex cursor-pointer items-center justify-between gap-3 bg-[#fbfcfd] px-[18px] py-[15px] [&::-webkit-details-marker]:hidden">
              <div>
                <h3 className="text-[13px] font-black text-navy-900">{mi + 1}. {hi ? m.nameHi : m.nameEn}</h3>
                <small className="text-[9.5px] text-muted">{m.lessons.length} {L('पाठ', 'lessons')} · {m.lessons.filter((l) => l.status === 'COMPLETED').length} {L('पूर्ण', 'completed')}</small>
              </div>
              <span className="text-orange-500 transition-transform group-open:rotate-180">⌄</span>
            </summary>
            {m.lessons.map((l) => {
              const done = l.status === 'COMPLETED';
              const label = !l.accessible ? L('अनलॉक', 'Unlock') : done ? L('रिव्यू', 'Review') : l.status === 'IN_PROGRESS' ? L('जारी रखें', 'Continue') : L('शुरू करें', 'Start');
              const href = l.accessible ? `/${locale}/learn/${l.lessonId}` : `/${locale}/pricing`;
              return (
                <div key={l.lessonId} className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 border-t border-[#edf2f5] px-[18px] py-3 ${l.accessible ? 'hover:bg-[#fbfcfd]' : 'opacity-60'}`}>
                  <span className={`grid h-[33px] w-[33px] place-items-center rounded-[10px] ${done ? 'bg-teal-100 text-teal-700' : 'bg-orange-100 text-orange-600'}`}>{lessonIcon(l)}</span>
                  <div className="min-w-0">
                    <div className="truncate text-[11.5px] font-extrabold text-ink">{hi ? l.titleHi : l.titleEn}</div>
                    <div className="mt-0.5 text-[9px] text-muted">{l.lessonType}{l.estimatedMinutes ? ` · ${l.estimatedMinutes} ${L('मिनट', 'min')}` : ''}{l.freePreview ? ` · ${L('मुफ़्त', 'free')}` : ''}</div>
                  </div>
                  <Link href={href} className="text-[10px] font-black text-orange-600">{label}</Link>
                </div>
              );
            })}
          </details>
        ))
      )}
    </article>
  );
}
