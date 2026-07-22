import type { CourseOutlineView } from '@rajyarank/contracts';

const LESSON_ICON: Record<string, string> = {
  VIDEO: '▶',
  PDF: '📄',
  TEXT: '📝',
  QUIZ: '❓',
  MIXED: '🎛',
};

/** Public (pre-purchase) syllabus: "what you'll learn" outcomes + a
 *  lesson-level curriculum accordion — so a prospective student can see what's
 *  actually inside a course, not just Subject→Chapter→Topic names. */
export function CourseSyllabus({ course, locale }: { course: CourseOutlineView; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const nm = (o: { nameHi: string; nameEn: string }) => (hi ? o.nameHi : o.nameEn);
  const promise = hi ? course.coursePromiseHi : course.coursePromiseEn;

  return (
    <>
      {promise ? <p className="mt-4 max-w-2xl text-muted">{promise}</p> : null}

      {course.learningOutcomes.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-black text-navy-900">{L('आप क्या सीखेंगे', "What you'll learn")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {course.learningOutcomes.map((o, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border border-line bg-white p-3 text-sm">
                <span className="mt-0.5 text-success">✓</span>
                <span className="text-ink">{o}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <h2 className="mb-4 mt-10 text-xl font-black text-navy-900">{L('सिलेबस', 'Syllabus')}</h2>
      {course.subjects.length === 0 ? (
        <p className="text-sm text-muted">{L('सिलेबस जल्द जोड़ा जाएगा।', 'Syllabus will be added soon.')}</p>
      ) : (
        <div className="grid gap-3">
          {course.subjects.map((s) => {
            const lessons = s.chapters.flatMap((c) => c.topics.flatMap((t) => t.lessons));
            return (
              <details key={s.id} className="rounded-lg border border-line bg-white p-4">
                <summary className="flex cursor-pointer items-center justify-between gap-2 font-black text-navy-900">
                  <span>{nm(s)}</span>
                  <span className="text-xs font-bold text-muted">{L(`${lessons.length} गतिविधियाँ`, `${lessons.length} activities`)}</span>
                </summary>
                <div className="mt-3 grid gap-1 pl-1">
                  {lessons.length === 0 ? (
                    <p className="text-xs text-muted">{L('जल्द जोड़ा जाएगा।', 'Content coming soon.')}</p>
                  ) : (
                    lessons.map((l) => (
                      <div key={l.id} className="flex items-center justify-between gap-3 rounded-md border border-line/60 px-3 py-2 text-sm">
                        <div className="flex items-center gap-2 text-ink">
                          <span aria-hidden="true">{LESSON_ICON[l.lessonType] ?? '•'}</span>
                          <span className="font-bold">{hi ? l.titleHi : l.titleEn}</span>
                          {l.estimatedMinutes ? <span className="text-xs text-muted">· {L(`${l.estimatedMinutes} मिनट`, `${l.estimatedMinutes} min`)}</span> : null}
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                            l.freePreview ? 'bg-teal-100 text-success' : 'bg-surface-soft text-muted'
                          }`}
                        >
                          {l.freePreview ? L('पूर्वावलोकन', 'Preview') : L('लॉक', 'Locked')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </>
  );
}
