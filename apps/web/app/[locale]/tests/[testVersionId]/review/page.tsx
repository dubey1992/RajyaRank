import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AttemptResult } from '@rajyarank/contracts';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe, initialsOf } from '@/lib/student';
import { StudentShell } from '@/components/StudentShell';

export const dynamic = 'force-dynamic';

const TRUE_FALSE_OPTIONS = [
  { key: 'TRUE', hi: 'सही', en: 'True' },
  { key: 'FALSE', hi: 'ग़लत', en: 'False' },
];

function asKeySet(v: unknown): Set<string> {
  if (Array.isArray(v)) return new Set(v.map(String));
  if (typeof v === 'string' || typeof v === 'number') return new Set([String(v)]);
  return new Set();
}

export default async function TestReviewPage({
  params,
  searchParams,
}: {
  params: { locale: string; testVersionId: string };
  searchParams: { attemptId?: string };
}) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const me = await getMe(cookie);
  if (!me) redirect(`/${locale}/login`);
  if (!searchParams.attemptId) redirect(`/${locale}/tests`);

  const result = await apiFetchServer<AttemptResult>(`/student/attempts/${searchParams.attemptId}/result`, cookie);
  if (!result) redirect(`/${locale}/tests`);

  return (
    <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={L('उत्तर समीक्षा', 'Review answers')}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-black tracking-tight text-navy-950 md:text-[34px]">{L('उत्तर समीक्षा', 'Review answers')}</h1>
          <p className="mt-1 text-sm text-muted">
            {result.score}/{result.maxScore} {L('अंक', 'marks')} · {result.correctCount} {L('सही', 'correct')} · {result.incorrectCount} {L('ग़लत', 'incorrect')} · {result.unansweredCount} {L('अनुत्तरित', 'unanswered')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/${locale}/tests`} className="rounded-xl border border-line bg-white px-3.5 py-2 text-[11px] font-extrabold text-navy-900 transition hover:bg-surface-soft">
            {L('सभी टेस्ट', 'Back to tests')}
          </Link>
          <Link href={`/${locale}/revision`} className="rounded-xl bg-orange-500 px-3.5 py-2 text-[11px] font-extrabold text-white transition hover:bg-orange-600">
            {L('कमज़ोर विषय देखें', 'View weak topics')}
          </Link>
        </div>
      </div>

      {!result.released || !result.questions ? (
        <div className="rounded-[20px] border border-line bg-white p-10 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[20px] bg-surface-soft text-2xl">🔒</div>
          <h3 className="mt-3.5 text-[15px] font-black text-navy-900">{L('अभी उपलब्ध नहीं', 'Not available yet')}</h3>
          <p className="mx-auto mt-1 max-w-sm text-[10.5px] text-muted">{L('विस्तृत समाधान परिणाम जारी होने पर दिखेंगे।', 'Detailed solutions appear once results are released.')}</p>
        </div>
      ) : (
        <div className="grid gap-3.5">
          {result.questions.map((q, i) => {
            const opts = q.type === 'TRUE_FALSE' ? TRUE_FALSE_OPTIONS : q.options;
            const correctKeys = asKeySet(q.correctAnswer);
            const selectedKeys = asKeySet(q.response);
            const choiceBased = opts.length > 0;
            const answered = q.response !== null && q.response !== undefined;

            return (
              <article key={q.questionVersionId} className="rounded-[18px] border border-line bg-white p-5 shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <p className="text-[14px] font-bold leading-relaxed text-ink">
                    {i + 1}. {(hi ? q.textHi : q.textEn) ?? q.textEn ?? q.textHi}
                  </p>
                  <span className={`flex-none rounded-full px-2.5 py-1 text-[10px] font-black ${q.isCorrect ? 'bg-teal-100 text-success' : answered ? 'bg-[#fff1f2] text-danger' : 'bg-line text-muted'}`}>
                    {q.isCorrect ? L('सही', 'Correct') : answered ? L('ग़लत', 'Incorrect') : L('अनुत्तरित', 'Unanswered')} · {q.awarded != null ? (q.awarded >= 0 ? `+${q.awarded}` : q.awarded) : '—'}
                  </span>
                </div>

                {choiceBased ? (
                  <ul className="grid gap-2">
                    {opts.map((o) => {
                      const isCorrectOpt = correctKeys.has(o.key);
                      const isSelectedOpt = selectedKeys.has(o.key);
                      const tone = isCorrectOpt
                        ? 'border-teal-300 bg-teal-50 text-success'
                        : isSelectedOpt
                          ? 'border-danger bg-[#fff1f2] text-danger'
                          : 'border-line bg-white text-ink';
                      return (
                        <li key={o.key} className={`flex items-center justify-between gap-2 rounded-[12px] border p-2.5 text-[12px] ${tone}`}>
                          <span><strong className="mr-2">{o.key}.</strong>{(hi ? o.hi : o.en) ?? o.en ?? o.hi}</span>
                          <span className="flex-none text-[9.5px] font-black">
                            {isCorrectOpt ? '✓ ' + L('सही उत्तर', 'Correct answer') : ''}
                            {isSelectedOpt && !isCorrectOpt ? '✗ ' + L('आपका उत्तर', 'Your answer') : ''}
                            {isSelectedOpt && isCorrectOpt ? ' · ' + L('आपका उत्तर', 'your answer') : ''}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="grid gap-1.5 text-[12px]">
                    <p><strong className="text-ink">{L('आपका उत्तर', 'Your answer')}:</strong> {answered ? JSON.stringify(q.response) : L('अनुत्तरित', 'Not answered')}</p>
                    <p><strong className="text-success">{L('सही उत्तर', 'Correct answer')}:</strong> {JSON.stringify(q.correctAnswer)}</p>
                  </div>
                )}

                {(hi ? q.explanationHi : q.explanationEn) ? (
                  <p className="mt-3 rounded-[12px] bg-surface-soft p-2.5 text-[11px] text-muted">
                    <strong className="text-ink">{L('व्याख्या', 'Explanation')}: </strong>
                    {hi ? q.explanationHi : q.explanationEn}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </StudentShell>
  );
}
