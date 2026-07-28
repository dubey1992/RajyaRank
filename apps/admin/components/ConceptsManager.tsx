'use client';
import { useEffect, useState } from 'react';
import { Alert, Button, Field, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';
import type { ConceptView } from '@rajyarank/contracts';

interface Ref { id: string; code: string; nameHi: string; nameEn: string }

export function ConceptsManager({
  initialExams,
  initialExamId,
  initialConcepts,
  locale,
}: {
  initialExams: Ref[];
  initialExamId: string;
  initialConcepts: ConceptView[];
  locale: 'hi' | 'en';
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  const [exams] = useState<Ref[]>(initialExams);
  const [examId, setExamId] = useState(initialExamId);
  const [concepts, setConcepts] = useState<ConceptView[]>(initialConcepts);
  const [toast, setToast] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!examId) return;
    apiFetch<ConceptView[]>(`/admin/concepts?examId=${examId}`)
      .then(setConcepts)
      .catch(() => setLoadError(L('कॉन्सेप्ट लोड नहीं हो सके।', 'Could not load concepts.')));
    // intentionally refetches only when the selected exam changes
  }, [examId]);

  const nameOf = (id: string | null) => {
    if (!id) return null;
    const c = concepts.find((x) => x.id === id);
    return c ? (hi ? c.nameHi : c.nameEn) : id;
  };

  // ── New concept form ──
  const [code, setCode] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [parentConceptId, setParentConceptId] = useState('');
  const [sequence, setSequence] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});

  async function createConcept() {
    const errs: Record<string, string> = {};
    if (!code.trim()) errs.code = L('कोड दर्ज करें।', 'Enter a code.');
    if (!nameHi.trim()) errs.nameHi = L('हिन्दी नाम दर्ज करें।', 'Enter the Hindi name.');
    if (!nameEn.trim()) errs.nameEn = L('English नाम दर्ज करें।', 'Enter the English name.');
    setErr(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const created = await apiFetch<ConceptView>('/admin/concepts', {
        method: 'POST',
        body: JSON.stringify({ examId, code: code.trim(), nameHi: nameHi.trim(), nameEn: nameEn.trim(), parentConceptId: parentConceptId || undefined, sequence }),
      });
      setConcepts((c) => [...c, created].sort((a, b) => a.sequence - b.sequence));
      setCode(''); setNameHi(''); setNameEn(''); setParentConceptId(''); setSequence(0); setErr({});
      setToast(L('कॉन्सेप्ट बनाया गया।', 'Concept created.'));
    } catch (e) {
      setErr(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  async function removeConcept(id: string) {
    setActionError(null);
    try {
      await apiFetch(`/admin/concepts/${id}`, { method: 'DELETE' });
      setConcepts((c) => c.filter((x) => x.id !== id));
      setToast(L('कॉन्सेप्ट हटाया गया।', 'Concept removed.'));
    } catch (e) {
      setActionError((e as ApiError).message ?? L('हटाया नहीं जा सका।', 'Could not remove.'));
    }
  }

  // ── Attach lesson/question by id ──
  const [attachConceptId, setAttachConceptId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [questionId, setQuestionId] = useState('');
  const [attachBusy, setAttachBusy] = useState(false);

  async function refreshConcepts() {
    const rows = await apiFetch<ConceptView[]>(`/admin/concepts?examId=${examId}`);
    setConcepts(rows);
  }

  async function attachLesson() {
    if (!attachConceptId || !lessonId.trim()) return;
    setAttachBusy(true);
    setActionError(null);
    try {
      await apiFetch(`/admin/concepts/${attachConceptId}/lessons/${lessonId.trim()}`, { method: 'POST' });
      setLessonId('');
      await refreshConcepts();
      setToast(L('पाठ जोड़ा गया।', 'Lesson linked.'));
    } catch (e) {
      setActionError((e as ApiError).message ?? L('जोड़ा नहीं जा सका।', 'Could not link.'));
    } finally {
      setAttachBusy(false);
    }
  }

  async function attachQuestion() {
    if (!attachConceptId || !questionId.trim()) return;
    setAttachBusy(true);
    setActionError(null);
    try {
      await apiFetch(`/admin/concepts/${attachConceptId}/questions/${questionId.trim()}`, { method: 'POST' });
      setQuestionId('');
      await refreshConcepts();
      setToast(L('प्रश्न जोड़ा गया।', 'Question linked.'));
    } catch (e) {
      setActionError((e as ApiError).message ?? L('जोड़ा नहीं जा सका।', 'Could not link.'));
    } finally {
      setAttachBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section>
        <div className="mb-3 flex items-center gap-2">
          <label className="text-sm font-extrabold text-navy-900">{L('परीक्षा', 'Exam')}</label>
          <select value={examId} onChange={(e) => setExamId(e.target.value)} className="rounded-md border border-line px-3 py-2 text-sm">
            <option value="">{L('परीक्षा चुनें…', 'Select exam…')}</option>
            {exams.map((x) => <option key={x.id} value={x.id}>{hi ? x.nameHi : x.nameEn}</option>)}
          </select>
        </div>

        {loadError ? <div className="mb-3"><Alert tone="error">{loadError}</Alert></div> : null}
        {actionError ? <div className="mb-3"><Alert tone="error">{actionError}</Alert></div> : null}

        <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('कॉन्सेप्ट', 'Concepts')} ({concepts.length})</h2>
        {concepts.length === 0 ? (
          <p className="text-sm text-muted">{L('अभी कोई कॉन्सेप्ट नहीं। दाईं ओर से बनाएँ।', 'No concepts yet. Create one on the right.')}</p>
        ) : (
          <ul className="grid gap-2">
            {concepts.map((c) => (
              <li key={c.id} className="rounded-md border border-line bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-navy-900">{hi ? c.nameHi : c.nameEn}</div>
                    <div className="text-xs text-muted">
                      {c.code}
                      {c.parentConceptId ? ` · ${L('अंतर्गत', 'under')} ${nameOf(c.parentConceptId)}` : ''}
                      {' · '}{L(`${c.lessonCount} पाठ`, `${c.lessonCount} lessons`)}
                      {' · '}{L(`${c.questionCount} प्रश्न`, `${c.questionCount} questions`)}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => setAttachConceptId(c.id)} className="rounded-md border border-line bg-white px-2 py-1 text-xs font-extrabold text-navy-900 hover:bg-surface-soft">
                      {L('जोड़ें', 'Link')}
                    </button>
                    <button type="button" onClick={() => void removeConcept(c.id)} className="rounded-md border border-line bg-white px-2 py-1 text-xs font-extrabold text-danger hover:bg-surface-soft">
                      {L('हटाएँ', 'Delete')}
                    </button>
                  </div>
                </div>
                {attachConceptId === c.id ? (
                  <div className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-2">
                    <div className="flex gap-1.5">
                      <input value={lessonId} onChange={(e) => setLessonId(e.target.value)} placeholder={L('पाठ आईडी', 'Lesson ID')} className="min-w-0 flex-1 rounded-md border border-line px-2 py-1.5 text-xs" />
                      <Button onClick={() => void attachLesson()} loading={attachBusy} className="!min-h-0 px-3 py-1.5 text-xs">{L('जोड़ें', 'Link')}</Button>
                    </div>
                    <div className="flex gap-1.5">
                      <input value={questionId} onChange={(e) => setQuestionId(e.target.value)} placeholder={L('प्रश्न आईडी', 'Question ID')} className="min-w-0 flex-1 rounded-md border border-line px-2 py-1.5 text-xs" />
                      <Button onClick={() => void attachQuestion()} loading={attachBusy} className="!min-h-0 px-3 py-1.5 text-xs">{L('जोड़ें', 'Link')}</Button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div>
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('नया कॉन्सेप्ट', 'New concept')}</h2>
          {err._form ? <div className="mb-3"><Alert tone="error">{err._form}</Alert></div> : null}
          <form noValidate onSubmit={(e) => { e.preventDefault(); void createConcept(); }}>
            <Field label={L('कोड', 'Code')} name="code" value={code} error={err.code} onChange={(e) => setCode(e.target.value)} />
            <label className="mb-1 block text-sm font-extrabold text-ink">{L('मूल कॉन्सेप्ट (वैकल्पिक)', 'Parent concept (optional)')}</label>
            <select value={parentConceptId} onChange={(e) => setParentConceptId(e.target.value)} className="mb-2 w-full rounded-md border border-line px-3 py-3 text-sm">
              <option value="">{L('कोई नहीं (शीर्ष-स्तर)', 'None (top-level)')}</option>
              {concepts.map((c) => <option key={c.id} value={c.id}>{hi ? c.nameHi : c.nameEn}</option>)}
            </select>
            <Field label={L('नाम (हिन्दी)', 'Name (Hindi)')} name="nameHi" value={nameHi} error={err.nameHi} onChange={(e) => setNameHi(e.target.value)} />
            <Field label={L('नाम (English)', 'Name (English)')} name="nameEn" value={nameEn} error={err.nameEn} onChange={(e) => setNameEn(e.target.value)} />
            <label className="mb-1 block text-sm font-extrabold text-ink">{L('क्रम', 'Sequence')}</label>
            <input type="number" min={0} value={sequence} onChange={(e) => setSequence(Number(e.target.value))} className="mb-3 w-full rounded-md border border-line px-3 py-3 text-sm" />
            <Button type="submit" loading={busy} disabled={!examId} className="w-full">{L('कॉन्सेप्ट बनाएँ', 'Create concept')}</Button>
          </form>
        </section>
      </div>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
