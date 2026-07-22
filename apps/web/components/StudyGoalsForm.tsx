'use client';
import { useEffect, useState } from 'react';
import { Alert, Button, Field, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';
import type { StudyGoals } from '@rajyarank/contracts';

interface Exam { id: string; nameHi: string; nameEn: string; stateId: string | null }
interface State { id: string; nameHi: string; nameEn: string }

const QUALS = ['10TH', '12TH', 'GRADUATE', 'POSTGRADUATE', 'TECHNICAL'] as const;

/** Lets a student revisit (or, if they skipped onboarding, fill in for the
 *  first time) their state/exam/qualification/daily-minutes/target-date —
 *  previously frozen forever once set at onboarding. */
export function StudyGoalsForm({ initial, locale }: { initial: StudyGoals; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [states, setStates] = useState<State[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [stateId, setStateId] = useState(initial.stateId ?? '');
  const [targetExamId, setTargetExamId] = useState(initial.targetExamId ?? '');
  const [qualification, setQualification] = useState(initial.qualification ?? '');
  const [dailyStudyMinutes, setDaily] = useState(initial.dailyStudyMinutes ?? 120);
  const [targetDate, setTargetDate] = useState(initial.targetDate ? initial.targetDate.slice(0, 10) : '');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<State[]>('/states').then(setStates).catch(() => undefined);
    void apiFetch<Exam[]>('/exams').then(setExams).catch(() => undefined);
  }, []);

  const examsForState = exams.filter((e) => !stateId || e.stateId === stateId);

  async function submit() {
    setBusy(true);
    setErrors({});
    try {
      await apiFetch('/student/profile/goals', {
        method: 'PATCH',
        body: JSON.stringify({
          stateId: stateId || undefined,
          targetExamId: targetExamId || undefined,
          qualification: qualification || undefined,
          dailyStudyMinutes,
          targetDate: targetDate ? new Date(targetDate).toISOString() : null,
        }),
      });
      setToast(L('लक्ष्य सहेजे गए।', 'Goals saved.'));
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md">
      {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
      <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-extrabold text-ink">{L('राज्य', 'State')}</span>
          <select value={stateId} onChange={(e) => { setStateId(e.target.value); setTargetExamId(''); }} className="w-full rounded-md border border-line bg-white px-3 py-3 text-sm outline-none focus:border-orange-500">
            <option value="">{L('चुनें', 'Select')}</option>
            {states.map((s) => <option key={s.id} value={s.id}>{hi ? s.nameHi : s.nameEn}</option>)}
          </select>
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-extrabold text-ink">{L('लक्ष्य परीक्षा', 'Target exam')}</span>
          <select value={targetExamId} onChange={(e) => setTargetExamId(e.target.value)} className="w-full rounded-md border border-line bg-white px-3 py-3 text-sm outline-none focus:border-orange-500">
            <option value="">{L('चुनें', 'Select')}</option>
            {examsForState.map((e) => <option key={e.id} value={e.id}>{hi ? e.nameHi : e.nameEn}</option>)}
          </select>
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-extrabold text-ink">{L('योग्यता', 'Qualification')}</span>
          <select value={qualification} onChange={(e) => setQualification(e.target.value)} className="w-full rounded-md border border-line bg-white px-3 py-3 text-sm outline-none focus:border-orange-500">
            <option value="">{L('चुनें', 'Select')}</option>
            {QUALS.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
        </label>
        <Field
          label={L('रोज़ कितने मिनट पढ़ेंगे?', 'Daily study minutes')}
          name="dailyStudyMinutes"
          type="number"
          min={15}
          max={720}
          value={dailyStudyMinutes}
          error={errors.dailyStudyMinutes}
          onChange={(e) => setDaily(Number(e.target.value))}
        />
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-extrabold text-ink">{L('परीक्षा तिथि (वैकल्पिक)', 'Target date (optional)')}</span>
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-full rounded-md border border-line bg-white px-3 py-3 text-sm outline-none focus:border-orange-500" />
        </label>
        <Button type="submit" loading={busy}>{L('लक्ष्य सहेजें', 'Save goals')}</Button>
      </form>
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </div>
  );
}
