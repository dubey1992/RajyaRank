'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import type { AttemptQuestion, AttemptResult, StartAttemptResponse } from '@rajyarank/contracts';

interface FlatQ extends AttemptQuestion {
  section: string;
}
type Answers = Record<string, { response: unknown; marked: boolean }>;

const BTN_OUTLINE = 'inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-[#cbd9e2] bg-white px-4 text-[12px] font-black text-navy-900 transition hover:-translate-y-0.5 disabled:opacity-50';
const BTN_PRIMARY = 'inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-[12px] font-black text-white shadow-[0_9px_20px_rgba(245,116,23,0.2)] transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:pointer-events-none disabled:opacity-40';
const BTN_SOFT = 'inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-orange-100 px-4 text-[12px] font-black text-orange-600 transition hover:-translate-y-0.5';
const BTN_DANGER = 'inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-[#fff1f2] px-4 text-[12px] font-black text-danger transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-40';

/** Submit is gated: either every question has an answer, or the clock is
 *  down to its last 5 minutes — otherwise a student could tap Submit before
 *  they meant to and lose unanswered questions with time still on the clock. */
const SUBMIT_GRACE_SECONDS = 5 * 60;

export function TestRunner({ testVersionId, locale }: { testVersionId: string; locale: string }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [phase, setPhase] = useState<'loading' | 'running' | 'done' | 'error'>('loading');
  const [attempt, setAttempt] = useState<StartAttemptResponse | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const seq = useRef(0);
  const submittedRef = useRef(false);

  const flat: FlatQ[] = useMemo(
    () => (attempt ? attempt.sections.flatMap((s) => s.questions.map((q) => ({ ...q, section: hi ? s.nameHi : s.nameEn }))) : []),
    [attempt, hi],
  );

  const submit = useCallback(async () => {
    if (submittedRef.current || !attempt) return;
    submittedRef.current = true;
    try {
      const res = await apiFetch<AttemptResult>(`/student/attempts/${attempt.attemptId}/submit`, { method: 'POST' });
      setResult(res);
      setPhase('done');
    } catch (e) {
      setError((e as ApiError).message);
      setPhase('error');
    }
  }, [attempt]);

  // Start the attempt.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch<StartAttemptResponse>(`/student/tests/${testVersionId}/attempts`, { method: 'POST' });
        if (cancelled) return;
        setAttempt(res);
        setRemaining(Math.max(0, Math.floor((new Date(res.expiresAt).getTime() - Date.now()) / 1000)));
        setPhase('running');
      } catch (e) {
        setError((e as ApiError).message);
        setErrorCode((e as ApiError).code ?? null);
        setPhase('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [testVersionId]);

  // Countdown + auto-submit.
  useEffect(() => {
    if (phase !== 'running') return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          void submit();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, submit]);

  const save = useCallback(
    async (q: FlatQ, response: unknown, marked: boolean) => {
      if (!attempt) return;
      setAnswers((a) => ({ ...a, [q.questionVersionId]: { response, marked } }));
      seq.current += 1;
      await apiFetch(`/student/attempts/${attempt.attemptId}/answers/${q.questionVersionId}`, {
        method: 'PUT',
        body: JSON.stringify({ response, markedForReview: marked, sequenceNo: seq.current }),
      }).catch(() => undefined); // offline-tolerant; timer/submit will re-sync final state
    },
    [attempt],
  );

  if (phase === 'loading') return <p className="py-16 text-center text-muted">{L('टेस्ट तैयार हो रहा है…', 'Preparing your test…')}</p>;
  if (phase === 'error') {
    return (
      <div className="mx-auto max-w-md py-10">
        <Alert tone={errorCode === 'CONFLICT' ? 'info' : 'error'}>{error}</Alert>
        <div className="mt-4 text-center">
          <Link href={`/${locale}/tests`} className={BTN_OUTLINE}>{L('सभी टेस्ट पर वापस जाएँ', 'Back to tests')}</Link>
        </div>
      </div>
    );
  }
  if (phase === 'done' && result) return <ResultView result={result} locale={locale} testVersionId={testVersionId} attemptId={attempt?.attemptId ?? null} />;

  const q = flat[idx];
  if (!q) return <p className="py-16 text-center text-muted">{L('कोई प्रश्न नहीं।', 'No questions.')}</p>;
  const current = answers[q.questionVersionId];
  const answeredCount = flat.filter((fq) => answers[fq.questionVersionId]?.response != null).length;
  const reviewCount = flat.filter((fq) => answers[fq.questionVersionId]?.marked).length;
  // Save & next requires the current question to actually have an answer, or
  // be explicitly marked for review — otherwise a student could click through
  // every question without engaging with any of them.
  const canAdvance = current?.response != null || current?.marked === true;
  const allAnswered = answeredCount === flat.length;
  const canSubmit = allAnswered || remaining <= SUBMIT_GRACE_SECONDS;

  return (
    <div className="grid gap-[18px] lg:grid-cols-[minmax(0,1fr)_280px]">
      <article className="rounded-[18px] border border-line bg-white p-5 shadow-[0_7px_22px_rgba(6,29,49,0.04)] sm:p-[22px]">
        <div className="flex items-center justify-between gap-3 border-b border-line pb-3.5">
          <strong className="text-[11px] text-muted">{q.section} · {L('प्रश्न', 'Question')} {idx + 1} {L('/', 'of')} {flat.length}</strong>
          <span className={`inline-flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-[11px] font-black ${remaining < 60 ? 'bg-[#fff1f2] text-danger' : 'bg-navy-100 text-navy-800'}`}>⏱ {fmt(remaining)}</span>
        </div>

        <p className="my-5 text-[17px] font-bold leading-relaxed text-ink">{(hi ? q.textHi : q.textEn) ?? q.textEn ?? q.textHi}</p>

        <QuestionInput q={q} value={current?.response} onChange={(resp) => void save(q, resp, current?.marked ?? false)} locale={locale} />

        <div className="mt-6 flex flex-wrap justify-between gap-2.5 border-t border-line pt-4">
          <button type="button" className={BTN_OUTLINE} onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>← {L('पिछला', 'Previous')}</button>
          <div className="flex flex-wrap gap-2.5">
            <button type="button" className={BTN_SOFT} onClick={() => void save(q, current?.response ?? null, !(current?.marked ?? false))}>
              🔖 {current?.marked ? L('रिव्यू हटाएँ', 'Unmark') : L('रिव्यू हेतु चिह्नित', 'Mark for review')}
            </button>
            <button type="button" className={BTN_OUTLINE} onClick={() => void save(q, null, current?.marked ?? false)}>{L('उत्तर हटाएँ', 'Clear')}</button>
            {idx < flat.length - 1 ? (
              <button
                type="button"
                className={BTN_PRIMARY}
                onClick={() => setIdx((i) => Math.min(flat.length - 1, i + 1))}
                disabled={!canAdvance}
                title={canAdvance ? undefined : L('अगले प्रश्न पर जाने के लिए उत्तर दें या रिव्यू हेतु चिह्नित करें।', 'Answer this question or mark it for review to continue.')}
              >
                {L('सेव और अगला', 'Save & next')} →
              </button>
            ) : (
              <button
                type="button"
                className={BTN_DANGER}
                onClick={() => void submit()}
                disabled={!canSubmit}
                title={canSubmit ? undefined : L('सबमिट करने के लिए सभी प्रश्नों के उत्तर दें, या अंतिम 5 मिनट की प्रतीक्षा करें।', 'Answer every question to submit, or wait for the last 5 minutes.')}
              >
                {L('सबमिट करें', 'Submit test')}
              </button>
            )}
          </div>
        </div>
        {!canAdvance && idx < flat.length - 1 ? (
          <p className="mt-2 text-right text-[10px] text-muted">{L('जारी रखने के लिए उत्तर दें या रिव्यू हेतु चिह्नित करें।', 'Answer or mark for review to continue.')}</p>
        ) : null}
      </article>

      <aside className="grid content-start gap-[18px]">
        <article className="rounded-[18px] border border-line bg-white p-[17px] shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
          <div className="mb-3">
            <h3 className="text-sm font-black text-navy-950">{L('प्रश्न पैलेट', 'Question palette')}</h3>
            <p className="text-[11px] text-muted">{answeredCount} {L('उत्तरित', 'answered')} · {reviewCount} {L('रिव्यू', 'review')}</p>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {flat.map((fq, i) => {
              const a = answers[fq.questionVersionId];
              const tone = i === idx
                ? 'bg-navy-900 text-white'
                : a?.marked
                  ? 'bg-[#f1e9ff] border-[#d9c2ff] text-[#7c3aed]'
                  : a && a.response != null
                    ? 'bg-teal-100 border-[#a8e7da] text-teal-700'
                    : 'bg-white border-line text-navy-900';
              return (
                <button key={fq.questionVersionId} onClick={() => setIdx(i)} className={`h-[34px] rounded-[9px] border text-[10px] font-black ${tone}`}>{i + 1}</button>
              );
            })}
          </div>
          <div className="mt-3.5 grid grid-cols-2 gap-2 text-[8.5px] text-muted">
            <span className="flex items-center gap-1.5"><i className="h-[11px] w-[11px] rounded bg-teal-100" />{L('उत्तरित', 'Answered')}</span>
            <span className="flex items-center gap-1.5"><i className="h-[11px] w-[11px] rounded bg-[#f1e9ff]" />{L('रिव्यू', 'Review')}</span>
            <span className="flex items-center gap-1.5"><i className="h-[11px] w-[11px] rounded bg-navy-900" />{L('वर्तमान', 'Current')}</span>
            <span className="flex items-center gap-1.5"><i className="h-[11px] w-[11px] rounded border border-line bg-white" />{L('अनदेखा', 'Not visited')}</span>
          </div>
          <button
            type="button"
            className={`mt-3.5 w-full ${BTN_DANGER}`}
            onClick={() => void submit()}
            disabled={!canSubmit}
            title={canSubmit ? undefined : L('सबमिट करने के लिए सभी प्रश्नों के उत्तर दें, या अंतिम 5 मिनट की प्रतीक्षा करें।', 'Answer every question to submit, or wait for the last 5 minutes.')}
          >
            {L('सबमिट करें', 'Submit')}
          </button>
          {!canSubmit ? (
            <p className="mt-2 text-center text-[9.5px] text-muted">{L('सभी प्रश्नों के उत्तर दें, या अंतिम 5 मिनट में सबमिट करें।', 'Answer all questions, or submit in the last 5 minutes.')}</p>
          ) : null}
        </article>
        <article className="rounded-[18px] border border-line bg-white p-[17px]">
          <h3 className="mb-1.5 text-sm font-black text-navy-950">{L('निर्देश', 'Instructions')}</h3>
          <p className="text-[10px] text-muted">{L('हर सही उत्तर पर अंक मिलते हैं; ग़लत उत्तर पर ऋणात्मक अंकन लागू हो सकता है। आपके उत्तर स्वतः सेव होते हैं।', 'Each correct answer carries marks; negative marking may apply. Your answers are auto-saved.')}</p>
        </article>
      </aside>
    </div>
  );
}

function QuestionInput({
  q,
  value,
  onChange,
  locale,
}: {
  q: FlatQ;
  value: unknown;
  onChange: (response: unknown) => void;
  locale: string;
}) {
  const hi = locale === 'hi';
  if (q.type === 'NUMERIC') {
    return (
      <input
        type="number"
        className="w-44 rounded-xl border border-line px-3 py-3 text-sm outline-none focus:border-orange-500"
        value={typeof value === 'number' ? value : ''}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }
  const opts = q.type === 'TRUE_FALSE' ? [{ key: 'TRUE', en: 'True', hi: 'सही' }, { key: 'FALSE', en: 'False', hi: 'ग़लत' }] : q.options;
  const multiple = q.type === 'MULTIPLE_CHOICE';
  const selected = new Set(Array.isArray(value) ? (value as string[]) : value != null ? [String(value)] : []);

  return (
    <div className="grid gap-2.5">
      {opts.map((o) => {
        const on = selected.has(o.key);
        return (
          <button
            key={o.key}
            onClick={() => {
              if (multiple) {
                const next = new Set(selected);
                if (next.has(o.key)) next.delete(o.key);
                else next.add(o.key);
                onChange([...next]);
              } else {
                onChange(o.key);
              }
            }}
            className={`flex items-center gap-3 rounded-[14px] border p-[13px] text-left text-[12px] transition ${on ? 'border-orange-500 bg-[#fff6ee] text-navy-900 shadow-[0_0_0_3px_rgba(245,116,23,0.08)]' : 'border-line bg-white text-ink hover:border-[#a9bdc9]'}`}
          >
            <span className={`grid h-[29px] w-[29px] flex-none place-items-center rounded-[9px] font-black ${on ? 'bg-orange-500 text-white' : 'bg-[#edf2f5]'}`}>{o.key}</span>
            {(hi ? o.hi : o.en) ?? o.en ?? o.hi}
          </button>
        );
      })}
    </div>
  );
}

function ResultView({
  result,
  locale,
  testVersionId,
  attemptId,
}: {
  result: AttemptResult;
  locale: string;
  testVersionId: string;
  attemptId: string | null;
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const pct = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;
  const message = pct >= 80 ? L('शानदार प्रयास!', 'Excellent attempt!') : pct >= 50 ? L('अच्छा प्रयास — सुधार जारी रखें।', 'Good attempt — keep improving.') : L('चलिए इसे रिवाइज़ करते हैं।', "Let's revise this together.");

  return (
    <div className="grid gap-[18px]">
      <article className="overflow-hidden rounded-[20px] bg-gradient-to-br from-navy-950 to-navy-800 p-8 text-center text-white">
        <div className="mx-auto grid h-[145px] w-[145px] place-content-center rounded-full border-[13px] border-white/10 shadow-[inset_0_0_0_8px_#0c8b77]">
          <strong className="text-[35px] font-black">{pct}%</strong>
          <span className="text-[10px] text-[#c3d8e4]">{L('आपका स्कोर', 'YOUR SCORE')}</span>
        </div>
        <h1 className="mt-4 text-[25px] font-black">{message}</h1>
        {result.passed !== null ? (
          <p className="mt-1.5 text-[11px] text-[#c5d9e4]">
            {result.passed ? L('आप उत्तीर्ण हुए', 'You passed') : L('कट-ऑफ़ से नीचे', 'Below the cut-off')}
            {result.passingScore != null ? ` · ${L('न्यूनतम', 'cut-off')} ${result.passingScore}%` : ''}
          </p>
        ) : null}
        <div className="mx-auto mt-5 grid max-w-2xl grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-xl bg-white/10 p-3"><strong className="block text-[15px]">{result.score}/{result.maxScore}</strong><small className="text-[8.5px] text-[#c9d9e3]">{L('अंक', 'MARKS')}</small></div>
          <div className="rounded-xl bg-white/10 p-3"><strong className="block text-[15px]">{result.correctCount}</strong><small className="text-[8.5px] text-[#c9d9e3]">{L('सही', 'CORRECT')}</small></div>
          <div className="rounded-xl bg-white/10 p-3"><strong className="block text-[15px]">{result.incorrectCount}</strong><small className="text-[8.5px] text-[#c9d9e3]">{L('ग़लत', 'INCORRECT')}</small></div>
          <div className="rounded-xl bg-white/10 p-3"><strong className="block text-[15px]">{result.accuracy}%</strong><small className="text-[8.5px] text-[#c9d9e3]">{L('सटीकता', 'ACCURACY')}</small></div>
        </div>
        {result.rank != null || result.percentile != null ? (
          <p className="mt-3 text-[11px] text-[#c5d9e4]">
            {result.rank != null ? `${L('रैंक', 'Rank')} #${result.rank}/${result.totalAttempts}` : ''}
            {result.rank != null && result.percentile != null ? ' · ' : ''}
            {result.percentile != null ? `${L('प्रतिशतक', 'Percentile')} ${result.percentile}` : ''}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          <Link href={`/${locale}/tests`} className="inline-flex min-h-[42px] items-center rounded-xl border border-white/25 bg-transparent px-4 text-[12px] font-black text-white">{L('सभी टेस्ट', 'Back to tests')}</Link>
          {attemptId ? (
            <Link href={`/${locale}/tests/${testVersionId}/review?attemptId=${attemptId}`} className="inline-flex min-h-[42px] items-center rounded-xl bg-white px-4 text-[12px] font-black text-navy-900">{L('उत्तर समीक्षा', 'Review answers')}</Link>
          ) : null}
          <Link href={`/${locale}/revision`} className="inline-flex min-h-[42px] items-center rounded-xl border border-white/25 bg-transparent px-4 text-[12px] font-black text-white">{L('कमज़ोर विषय', 'Weak topics')}</Link>
        </div>
      </article>

      {result.subjectAnalysis.length ? (
        <article className="rounded-[18px] border border-line bg-white p-5 shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
          <h2 className="mb-3 text-base font-black tracking-tight text-navy-950">{L('विषयवार प्रदर्शन', 'Subject performance')}</h2>
          <div className="grid gap-3">
            {result.subjectAnalysis.map((s) => {
              const sp = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
              return (
                <div key={s.subject} className="grid grid-cols-[110px_1fr_42px] items-center gap-2.5">
                  <span className="text-[10.5px] font-bold text-ink">{s.subject}</span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-line"><span className={`block h-full rounded-full ${sp < 50 ? 'bg-danger' : sp < 75 ? 'bg-warning' : 'bg-teal-600'}`} style={{ width: `${sp}%` }} /></div>
                  <strong className="text-right text-[10px]">{s.correct}/{s.total}</strong>
                </div>
              );
            })}
          </div>
        </article>
      ) : null}

      {!result.released ? (
        <Alert tone="info">{L('विस्तृत समाधान परिणाम जारी होने पर दिखेंगे।', 'Detailed solutions appear when results are released.')}</Alert>
      ) : null}

      <div className="text-center text-[10px] text-muted">{testVersionId.slice(0, 8)}</div>
    </div>
  );
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
