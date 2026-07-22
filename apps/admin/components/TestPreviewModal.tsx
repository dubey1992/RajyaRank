'use client';
import { useEffect, useState } from 'react';
import { Alert } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';

interface PreviewQuestion {
  questionVersionId: string;
  marks: number;
  negativeMarks: number;
  type: string;
  textHi: string | null;
  textEn: string | null;
  options: unknown;
  correctAnswer: unknown;
  explanationHi: string | null;
  explanationEn: string | null;
}

interface PreviewSection {
  nameHi: string;
  nameEn: string;
  questions: PreviewQuestion[];
}

interface PreviewData {
  testVersionId: string;
  titleHi: string;
  titleEn: string;
  status: string;
  durationMinutes: number;
  sections: PreviewSection[];
}

interface OptionRow { key: string; hi?: string; en?: string }

/** Read-only question list for a mock test — lets a maker/reviewer actually
 *  see the questions (text, options, correct answer) before submitting,
 *  approving, or publishing, not just the test's title and duration. */
export function TestPreviewModal({ testVersionId, locale, onClose }: { testVersionId: string; locale: 'hi' | 'en'; onClose: () => void }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [data, setData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<PreviewData>(`/staff/tests/versions/${testVersionId}/detail`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError((e as ApiError).message ?? L('लोड नहीं हो सका।', 'Could not load.')); });
    return () => { cancelled = true; };
  }, [testVersionId]);

  const title = data ? (hi ? data.titleHi : data.titleEn) || data.titleEn || data.titleHi : '';
  const questionCount = data ? data.sections.reduce((n, s) => n + s.questions.length, 0) : 0;

  function optionRows(options: unknown): OptionRow[] {
    return Array.isArray(options) ? (options as OptionRow[]) : [];
  }
  function isCorrect(key: string, correctAnswer: unknown): boolean {
    if (Array.isArray(correctAnswer)) return correctAnswer.includes(key);
    return false;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4" role="dialog" aria-modal="true" aria-label={L('प्रश्न देखें', 'View questions')}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-black text-navy-900">{L('प्रश्न देखें', 'View questions')}</h2>
          <button type="button" onClick={onClose} aria-label={L('बंद करें', 'Close')} className="text-muted hover:text-ink">✕</button>
        </div>

        {error ? <Alert tone="error">{error}</Alert> : null}
        {!data && !error ? <p className="text-sm text-muted">{L('लोड हो रहा है…', 'Loading…')}</p> : null}

        {data ? (
          <div className="grid gap-4">
            <div className="rounded-md bg-surface-soft p-2 text-sm">
              <p className="font-bold text-ink">{title}</p>
              <p className="text-xs text-muted">
                {data.durationMinutes} {L('मिनट', 'min')} · {questionCount} {L('प्रश्न', 'question(s)')}
              </p>
            </div>

            {data.sections.map((s, si) => (
              <div key={si} className="grid gap-3">
                <h3 className="text-sm font-extrabold text-navy-900">{hi ? s.nameHi : s.nameEn}</h3>
                {s.questions.length === 0 ? (
                  <p className="text-sm text-muted">{L('इस खंड में कोई प्रश्न नहीं।', 'No questions in this section.')}</p>
                ) : (
                  s.questions.map((q, qi) => (
                    <div key={q.questionVersionId} className="rounded-md border border-line p-3 text-sm">
                      <p className="mb-2 font-bold text-ink">
                        {qi + 1}. {(hi ? q.textHi : q.textEn) ?? q.textEn ?? q.textHi ?? '—'}
                      </p>
                      {optionRows(q.options).length > 0 ? (
                        <ul className="mb-2 grid gap-1">
                          {optionRows(q.options).map((o) => (
                            <li
                              key={o.key}
                              className={`rounded px-2 py-1 text-xs ${isCorrect(o.key, q.correctAnswer) ? 'bg-teal-100 font-extrabold text-success' : 'bg-surface-soft text-ink'}`}
                            >
                              {o.key}. {(hi ? o.hi : o.en) ?? o.en ?? o.hi}
                              {isCorrect(o.key, q.correctAnswer) ? ` ✓ ${L('सही', 'Correct')}` : ''}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {(hi ? q.explanationHi : q.explanationEn) ? (
                        <p className="text-xs text-muted">{L('व्याख्या: ', 'Explanation: ')}{hi ? q.explanationHi : q.explanationEn}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted">
                        {q.type} · {q.marks} {L('अंक', 'mark(s)')} · -{q.negativeMarks}
                      </p>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
