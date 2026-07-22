'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Field } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';

interface CourseRef { id: string; code: string; titleHi: string; titleEn: string; examId: string }
interface Subject { id: string; nameHi: string; nameEn: string }
interface Outline { id: string; subjects: Subject[] }

const KEYS = ['A', 'B', 'C', 'D'];

/** Single-choice question authoring. Subject is chosen via course → subject
 *  (real ids from the catalogue) rather than a raw UUID, so create always
 *  targets a valid subject. Server validates answer shape + scope. */
export function QuickQuestionForm({ locale = 'en' }: { locale?: string }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const router = useRouter();

  const [courses, setCourses] = useState<CourseRef[]>([]);
  const [courseId, setCourseId] = useState('');
  const [outline, setOutline] = useState<Outline | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [textEn, setTextEn] = useState('');
  const [textHi, setTextHi] = useState('');
  const [opts, setOpts] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState('A');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    apiFetch<CourseRef[]>('/courses').then(setCourses).catch(() => setCourses([]));
  }, []);
  useEffect(() => {
    setOutline(null);
    setSubjectId('');
    if (!courseId) return;
    apiFetch<Outline>(`/courses/${courseId}/outline`).then(setOutline).catch(() => setOutline(null));
  }, [courseId]);

  const subjects = outline?.subjects ?? [];
  const examId = courses.find((c) => c.id === courseId)?.examId;

  function validateForm(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!subjectId) errs.subjectId = L('कृपया कोर्स और विषय चुनें।', 'Please select a course and subject.');
    if (!textEn.trim() && !textHi.trim()) errs.textEn = L('कृपया कम से कम एक भाषा में प्रश्न दर्ज करें।', 'Please enter the question in at least one language.');
    KEYS.forEach((k, i) => {
      if (!opts[i]?.trim()) errs[`opt${k}`] = L('कृपया यह विकल्प भरें।', 'Please fill in this option.');
    });
    return errs;
  }

  async function submit() {
    const errs = validateForm();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setMsg(null);
    try {
      await apiFetch('/staff/questions', {
        method: 'POST',
        body: JSON.stringify({
          type: 'SINGLE_CHOICE',
          subjectId,
          examId: examId ?? undefined,
          textEn: textEn.trim() || undefined,
          textHi: textHi.trim() || undefined,
          options: KEYS.map((k, i) => ({ key: k, en: opts[i]?.trim() || undefined })),
          correctAnswer: [correct],
          difficulty,
          marks: 1,
          negativeMarks: 0.25,
        }),
      });
      setMsg({ tone: 'success', text: L('प्रश्न बन गया (ड्राफ़्ट)।', 'Question created (draft).') });
      setTextEn('');
      setTextHi('');
      setOpts(['', '', '', '']);
      setCorrect('A');
      setErrors({});
      router.refresh();
    } catch (e) {
      const fe = serverFieldErrors(e as ApiError);
      setErrors(fe);
      setMsg({ tone: 'error', text: fe._form ?? L('प्रश्न बनाना विफल रहा।', 'Failed to create the question.') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-xl rounded-lg border border-line bg-white p-5">
      <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('नया प्रश्न (एकल-विकल्प)', 'New question (single-choice)')}</h2>
      {msg ? <div className="mb-3"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}
      <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <label className="mb-1 block text-sm font-extrabold text-ink" htmlFor="q-course">{L('कोर्स', 'Course')}</label>
        <select id="q-course" value={courseId} onChange={(e) => setCourseId(e.target.value)} className="mb-3 w-full rounded-md border border-line px-3 py-3 text-sm">
          <option value="">{L('कोर्स चुनें…', 'Select course…')}</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{hi ? c.titleHi : c.titleEn} ({c.code})</option>)}
        </select>

        <label className="mb-1 block text-sm font-extrabold text-ink" htmlFor="q-subject">{L('विषय', 'Subject')}</label>
        <select id="q-subject" value={subjectId} disabled={!subjects.length} onChange={(e) => setSubjectId(e.target.value)} className="w-full rounded-md border border-line px-3 py-3 text-sm">
          <option value="">{L('विषय चुनें…', 'Select subject…')}</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{hi ? s.nameHi : s.nameEn}</option>)}
        </select>
        {errors.subjectId ? <p role="alert" className="mt-1 text-sm text-danger">{errors.subjectId}</p> : null}
        {courses.length === 0 ? <p className="mt-1 text-xs text-muted">{L('कोई प्रकाशित कोर्स नहीं मिला। पहले एक कोर्स + विषय बनाएँ।', 'No published courses found. Create a course + subject first.')}</p> : null}

        <div className="mt-3" />
        <Field label={L('प्रश्न (English)', 'Question (English)')} name="en" value={textEn} error={errors.textEn} onChange={(e) => setTextEn(e.target.value)} />
        <Field label={L('प्रश्न (हिन्दी)', 'Question (Hindi)')} name="hi" value={textHi} onChange={(e) => setTextHi(e.target.value)} />
        {KEYS.map((k, i) => (
          <Field
            key={k}
            label={L(`विकल्प ${k}`, `Option ${k}`)}
            name={`opt${k}`}
            value={opts[i]}
            error={errors[`opt${k}`]}
            onChange={(e) => setOpts((o) => o.map((v, j) => (j === i ? e.target.value : v)))}
          />
        ))}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-extrabold text-ink" htmlFor="correct">{L('सही विकल्प', 'Correct option')}</label>
            <select id="correct" className="mb-4 w-full rounded-md border border-line px-3 py-3" value={correct} onChange={(e) => setCorrect(e.target.value)}>
              {KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-extrabold text-ink" htmlFor="difficulty">{L('कठिनाई', 'Difficulty')}</label>
            <select id="difficulty" className="mb-4 w-full rounded-md border border-line px-3 py-3" value={difficulty} onChange={(e) => setDifficulty(e.target.value as 'EASY' | 'MEDIUM' | 'HARD')}>
              <option value="EASY">{L('आसान', 'Easy')}</option>
              <option value="MEDIUM">{L('मध्यम', 'Medium')}</option>
              <option value="HARD">{L('कठिन', 'Hard')}</option>
            </select>
          </div>
        </div>
        <Button type="submit" variant="secondary" loading={busy} className="w-full">
          {L('ड्राफ़्ट बनाएँ', 'Create draft')}
        </Button>
      </form>
    </section>
  );
}
