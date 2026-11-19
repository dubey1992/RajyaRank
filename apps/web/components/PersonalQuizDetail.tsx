'use client';
import { useState } from 'react';
import { Button } from '@rajyarank/ui';
import type { BulkImportResult, PersonalQuizAttemptResult, PersonalQuizDetail as PersonalQuizDetailType, PersonalQuizQuestionEditView } from '@rajyarank/contracts';
import { apiFetch, type ApiError } from '@/lib/api';

const inputCls = 'mb-3 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-500';

type UiType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'NUMERIC';
const TYPE_LABELS: Record<UiType, { hi: string; en: string }> = {
  SINGLE_CHOICE: { hi: 'एकल विकल्प', en: 'Single choice' },
  MULTIPLE_CHOICE: { hi: 'बहु विकल्प', en: 'Multiple choice' },
  TRUE_FALSE: { hi: 'सही/गलत', en: 'True/False' },
  NUMERIC: { hi: 'संख्यात्मक', en: 'Numeric' },
};

interface TakeQuestion { id: string; type: string; text: string; options: { key: string; text: string }[]; sequence: number }

export function PersonalQuizDetail({ initial, locale }: { initial: PersonalQuizDetailType; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  const [quiz, setQuiz] = useState(initial);
  const [mode, setMode] = useState<'edit' | 'take' | 'result'>('edit');

  // --- Question builder state ---
  const [adding, setAdding] = useState(false);
  const [qType, setQType] = useState<UiType>('SINGLE_CHOICE');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState<{ key: string; text: string }[]>([{ key: 'A', text: '' }, { key: 'B', text: '' }]);
  const [qCorrectKeys, setQCorrectKeys] = useState<string[]>([]);
  const [qNumericValue, setQNumericValue] = useState('');
  const [qExplanation, setQExplanation] = useState('');
  const [qBusy, setQBusy] = useState(false);
  const [qError, setQError] = useState<string | null>(null);

  // --- Bulk import (deterministic template parsing, no AI) ---
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);

  // --- Take-quiz state ---
  const [takeQuestions, setTakeQuestions] = useState<TakeQuestion[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [takeBusy, setTakeBusy] = useState(false);
  const [takeError, setTakeError] = useState<string | null>(null);
  const [result, setResult] = useState<PersonalQuizAttemptResult | null>(null);

  function resetQuestionForm() {
    setQType('SINGLE_CHOICE'); setQText(''); setQOptions([{ key: 'A', text: '' }, { key: 'B', text: '' }]);
    setQCorrectKeys([]); setQNumericValue(''); setQExplanation(''); setQError(null);
  }

  async function addQuestion() {
    setQError(null);
    if (!qText.trim()) return setQError(L('कृपया सवाल लिखें।', 'Please write the question.'));
    let options: { key: string; text: string }[] = [];
    let correctAnswer: unknown;
    if (qType === 'TRUE_FALSE') {
      options = [{ key: 'TRUE', text: L('सही', 'True') }, { key: 'FALSE', text: L('गलत', 'False') }];
      if (!qCorrectKeys.length) return setQError(L('सही उत्तर चुनें।', 'Pick the correct answer.'));
      correctAnswer = qCorrectKeys;
    } else if (qType === 'NUMERIC') {
      const v = Number(qNumericValue);
      if (Number.isNaN(v)) return setQError(L('कृपया एक मान्य संख्या दर्ज करें।', 'Please enter a valid number.'));
      correctAnswer = { value: v };
    } else {
      options = qOptions.filter((o) => o.text.trim());
      if (options.length < 2) return setQError(L('कम से कम दो विकल्प दें।', 'Provide at least two options.'));
      if (!qCorrectKeys.length) return setQError(L('सही उत्तर चुनें।', 'Pick the correct answer(s).'));
      correctAnswer = qCorrectKeys;
    }
    setQBusy(true);
    try {
      const created = await apiFetch<PersonalQuizQuestionEditView>(`/student/my-quizzes/${quiz.id}/questions`, {
        method: 'POST',
        body: JSON.stringify({ type: qType, text: qText.trim(), options, correctAnswer, explanation: qExplanation.trim() || undefined }),
      });
      setQuiz((prev) => ({ ...prev, questionCount: prev.questionCount + 1, questions: [...prev.questions, created] }));
      resetQuestionForm();
      setAdding(false);
    } catch (e) {
      setQError((e as ApiError).message);
    } finally {
      setQBusy(false);
    }
  }

  async function deleteQuestion(id: string) {
    if (!confirm(L('यह सवाल हटाएँ?', 'Delete this question?'))) return;
    await apiFetch(`/student/my-quizzes/${quiz.id}/questions/${id}`, { method: 'DELETE' }).catch((e) => alert((e as ApiError).message));
    setQuiz((prev) => ({ ...prev, questionCount: prev.questionCount - 1, questions: prev.questions.filter((q) => q.id !== id) }));
  }

  async function submitBulkImport() {
    setImportError(null);
    setImportResult(null);
    if (!importText.trim()) return setImportError(L('कृपया सवाल पेस्ट करें या फ़ाइल चुनें।', 'Please paste questions or choose a file.'));
    setImportBusy(true);
    try {
      const res = await apiFetch<BulkImportResult>(`/student/my-quizzes/${quiz.id}/questions/bulk-text`, {
        method: 'POST',
        body: JSON.stringify({ text: importText }),
      });
      setImportResult(res);
      if (res.imported > 0) {
        const fresh = await apiFetch<PersonalQuizDetailType>(`/student/my-quizzes/${quiz.id}`);
        setQuiz(fresh);
        setImportText('');
      }
    } catch (e) {
      setImportError((e as ApiError).message);
    } finally {
      setImportBusy(false);
    }
  }

  async function startTake() {
    setTakeError(null);
    setTakeBusy(true);
    try {
      const started = await apiFetch<{ attemptId: string; questions: TakeQuestion[] }>(`/student/my-quizzes/${quiz.id}/attempts`, { method: 'POST' });
      setAttemptId(started.attemptId);
      setTakeQuestions(started.questions);
      setAnswers({});
      setMode('take');
    } catch (e) {
      setTakeError((e as ApiError).message);
    } finally {
      setTakeBusy(false);
    }
  }

  async function submitTake() {
    if (!attemptId) return;
    setTakeBusy(true);
    try {
      const res = await apiFetch<PersonalQuizAttemptResult>(`/student/my-quizzes/attempts/${attemptId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      });
      setResult(res);
      setMode('result');
    } catch (e) {
      setTakeError((e as ApiError).message);
    } finally {
      setTakeBusy(false);
    }
  }

  if (mode === 'result' && result) {
    const breakdownByQ = new Map(result.breakdown.map((b) => [b.questionId, b]));
    return (
      <div className="grid gap-4">
        <div className="rounded-[15px] border border-line bg-white p-5 text-center">
          <div className="text-[10px] font-black uppercase text-muted">{L('आपका स्कोर', 'Your score')}</div>
          <div className="mt-1 text-3xl font-black text-navy-950">{result.score}/{result.maxScore}</div>
        </div>
        {result.revisionScheduledFor ? (
          <div className="rounded-[15px] border border-[#f1e9ff] bg-[#faf7ff] p-3 text-center text-[11.5px] font-bold text-[#7c3aed]">
            {L(
              `इस विषय के लिए ${new Date(result.revisionScheduledFor).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' })} को एक रिवीज़न सत्र जोड़ा गया — `,
              `Added a revision session for this topic on ${new Date(result.revisionScheduledFor).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} — `,
            )}
            <a href={`/${locale}/study-plan`} className="underline">{L('स्टडी प्लान देखें', 'see study plan')}</a>
          </div>
        ) : null}
        <div className="grid gap-2.5">
          {takeQuestions.map((q) => {
            const b = breakdownByQ.get(q.id);
            return (
              <div key={q.id} className={`rounded-[15px] border p-4 ${b?.correct ? 'border-teal-200 bg-teal-50/40' : 'border-[#fde8e8] bg-[#fff8f8]'}`}>
                <div className="text-[13px] font-extrabold text-ink">{q.text}</div>
                <div className="mt-1 text-[11px] font-bold text-muted">{b?.correct ? `✓ ${L('सही', 'Correct')}` : `✗ ${L('गलत', 'Incorrect')}`}</div>
                {b?.explanation ? <div className="mt-1 text-[11px] text-muted">{b.explanation}</div> : null}
              </div>
            );
          })}
        </div>
        <Button type="button" onClick={() => setMode('edit')}>{L('वापस जाएँ', 'Back to quiz')}</Button>
      </div>
    );
  }

  if (mode === 'take') {
    return (
      <div className="grid gap-4">
        {takeError ? <p className="text-xs font-bold text-danger">{takeError}</p> : null}
        <div className="grid gap-2.5">
          {takeQuestions.map((q, i) => (
            <div key={q.id} className="rounded-[15px] border border-line bg-white p-4">
              <div className="mb-2 text-[13px] font-extrabold text-ink">{i + 1}. {q.text}</div>
              {q.type === 'NUMERIC' ? (
                <input type="number" className={inputCls} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: Number(e.target.value) }))} />
              ) : q.type === 'MULTIPLE_CHOICE' ? (
                <div className="grid gap-1.5">
                  {q.options.map((o) => (
                    <label key={o.key} className="flex items-center gap-2 text-[12.5px]">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          const cur = (answers[q.id] as string[] | undefined) ?? [];
                          setAnswers((prev) => ({ ...prev, [q.id]: e.target.checked ? [...cur, o.key] : cur.filter((k) => k !== o.key) }));
                        }}
                      />
                      {o.text}
                    </label>
                  ))}
                </div>
              ) : (
                <div className="grid gap-1.5">
                  {q.options.map((o) => (
                    <label key={o.key} className="flex items-center gap-2 text-[12.5px]">
                      <input type="radio" name={q.id} onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: [o.key] }))} />
                      {o.text}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button type="button" loading={takeBusy} onClick={() => void submitTake()}>{L('जमा करें', 'Submit')}</Button>
          <button type="button" onClick={() => setMode('edit')} className="rounded-md px-3 py-2 text-xs font-bold text-muted hover:bg-surface-soft">{L('रद्द करें', 'Cancel')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-[15px] border border-line bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-black text-navy-950">{L('सवाल', 'Questions')} ({quiz.questionCount})</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setImporting((v) => !v)} className="rounded-md border border-line px-2.5 py-1.5 text-[11px] font-bold text-navy-900 hover:bg-surface-soft">
              ⇪ {L('थोक में आयात करें', 'Bulk import')}
            </button>
            <button type="button" onClick={() => setAdding((v) => !v)} className="rounded-md border border-line px-2.5 py-1.5 text-[11px] font-bold text-navy-900 hover:bg-surface-soft">
              + {L('सवाल जोड़ें', 'Add question')}
            </button>
            <Button type="button" loading={takeBusy} disabled={!quiz.questionCount} onClick={() => void startTake()}>
              ▶ {L('टेस्ट लें', 'Take test')}
            </Button>
          </div>
        </div>

        {importing ? (
          <div className="mb-4 rounded-xl border border-dashed border-line p-3">
            <p className="mb-2 text-[10.5px] text-muted">
              {L(
                'इस प्रारूप में पेस्ट करें या .txt फ़ाइल अपलोड करें — बिना AI के, सीधे पार्स होता है:',
                'Paste in this format, or upload a .txt file — parsed directly, no AI:',
              )}
            </p>
            <pre className="mb-3 overflow-x-auto rounded-md bg-surface-soft p-2.5 text-[10.5px] leading-relaxed text-muted">
{`Q: Capital of India?
A) Mumbai
B) Delhi
Answer: B
Explanation: optional
---
Q: Next question...`}
            </pre>
            <textarea
              className={`${inputCls} h-32 font-mono text-[11.5px]`}
              placeholder={L('यहाँ पेस्ट करें', 'Paste here')}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <label className="mb-3 block text-[10.5px] text-muted">
              {L('या फ़ाइल अपलोड करें:', 'Or upload a file:')}{' '}
              <input
                type="file"
                accept=".txt,text/plain"
                className="text-[10.5px]"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setImportText(String(reader.result ?? ''));
                  reader.readAsText(file);
                }}
              />
            </label>
            {importError ? <p className="mb-2 text-xs font-bold text-danger">{importError}</p> : null}
            {importResult ? (
              <div className="mb-2 text-xs">
                <p className="font-bold text-teal-600">{L(`${importResult.imported} सवाल जोड़े गए।`, `${importResult.imported} question(s) imported.`)}</p>
                {importResult.errors.map((err, i) => (
                  <p key={i} className="font-bold text-danger">{L(`ब्लॉक ${err.block}: `, `Block ${err.block}: `)}{err.message}</p>
                ))}
              </div>
            ) : null}
            <Button type="button" loading={importBusy} onClick={() => void submitBulkImport()}>{L('आयात करें', 'Import')}</Button>
          </div>
        ) : null}

        {adding ? (
          <div className="mb-4 rounded-xl border border-dashed border-line p-3">
            <select className={inputCls} value={qType} onChange={(e) => { setQType(e.target.value as UiType); setQCorrectKeys([]); }}>
              {(Object.keys(TYPE_LABELS) as UiType[]).map((t) => <option key={t} value={t}>{hi ? TYPE_LABELS[t].hi : TYPE_LABELS[t].en}</option>)}
            </select>
            <textarea className={`${inputCls} h-16`} placeholder={L('सवाल लिखें', 'Write the question')} value={qText} onChange={(e) => setQText(e.target.value)} />

            {qType === 'NUMERIC' ? (
              <input type="number" className={inputCls} placeholder={L('सही संख्यात्मक उत्तर', 'Correct numeric answer')} value={qNumericValue} onChange={(e) => setQNumericValue(e.target.value)} />
            ) : qType === 'TRUE_FALSE' ? (
              <div className="mb-3 flex gap-3">
                {(['TRUE', 'FALSE'] as const).map((k) => (
                  <label key={k} className="flex items-center gap-1.5 text-[12.5px] font-bold">
                    <input type="radio" name="tf" checked={qCorrectKeys[0] === k} onChange={() => setQCorrectKeys([k])} />
                    {k === 'TRUE' ? L('सही', 'True') : L('गलत', 'False')}
                  </label>
                ))}
              </div>
            ) : (
              <div className="mb-2 grid gap-1.5">
                {qOptions.map((o, i) => (
                  <div key={o.key} className="flex items-center gap-2">
                    <input
                      type={qType === 'MULTIPLE_CHOICE' ? 'checkbox' : 'radio'}
                      name="opt"
                      checked={qCorrectKeys.includes(o.key)}
                      onChange={(e) => {
                        if (qType === 'MULTIPLE_CHOICE') {
                          setQCorrectKeys((prev) => (e.target.checked ? [...prev, o.key] : prev.filter((k) => k !== o.key)));
                        } else {
                          setQCorrectKeys([o.key]);
                        }
                      }}
                    />
                    <input
                      className="flex-1 rounded-md border border-line px-2.5 py-1.5 text-[12.5px]"
                      placeholder={`${L('विकल्प', 'Option')} ${o.key}`}
                      value={o.text}
                      onChange={(e) => setQOptions((prev) => prev.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                    />
                  </div>
                ))}
                {qOptions.length < 6 ? (
                  <button
                    type="button"
                    onClick={() => setQOptions((prev) => [...prev, { key: String.fromCharCode(65 + prev.length), text: '' }])}
                    className="justify-self-start text-[11px] font-bold text-orange-600 hover:underline"
                  >
                    + {L('विकल्प जोड़ें', 'Add option')}
                  </button>
                ) : null}
              </div>
            )}

            <textarea className={`${inputCls} h-16 mt-2`} placeholder={L('व्याख्या (वैकल्पिक)', 'Explanation (optional)')} value={qExplanation} onChange={(e) => setQExplanation(e.target.value)} />
            {qError ? <p className="mb-2 text-xs font-bold text-danger">{qError}</p> : null}
            <Button type="button" loading={qBusy} onClick={() => void addQuestion()}>{L('जोड़ें', 'Add')}</Button>
          </div>
        ) : null}

        {quiz.questions.length === 0 ? (
          <p className="text-xs text-muted">{L('अभी तक कोई सवाल नहीं जोड़ा गया।', 'No questions added yet.')}</p>
        ) : (
          <div className="grid gap-2">
            {quiz.questions.map((q, i) => (
              <div key={q.id} className="flex items-start justify-between gap-2 rounded-xl border border-line p-2.5">
                <div className="min-w-0">
                  <div className="text-[9px] font-black uppercase text-muted">{hi ? TYPE_LABELS[q.type as UiType]?.hi ?? q.type : TYPE_LABELS[q.type as UiType]?.en ?? q.type}</div>
                  <div className="mt-0.5 text-[13px] font-extrabold text-ink">{i + 1}. {q.text}</div>
                  {q.generatedByAi ? <span className="mt-1 inline-block rounded-full bg-[#f1e9ff] px-2 py-0.5 text-[9px] font-black text-[#7c3aed]">{L('AI जनित', 'AI-generated')}</span> : null}
                </div>
                <button type="button" onClick={() => void deleteQuestion(q.id)} className="shrink-0 rounded-md px-2 py-1 text-[10px] font-bold text-muted hover:bg-surface-soft">
                  {L('हटाएँ', 'Remove')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
