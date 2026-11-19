'use client';
import { useState } from 'react';
import { Button } from '@rajyarank/ui';
import type { PyqPaperDownload, StudentPaperAttemptResult, StudentPaperView } from '@rajyarank/contracts';
import { apiFetch, type ApiError } from '@/lib/api';

export function StudentPaperDetail({ initial, locale }: { initial: StudentPaperView; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  const [downloading, setDownloading] = useState(false);
  const [mode, setMode] = useState<'view' | 'take' | 'result'>('view');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StudentPaperAttemptResult | null>(null);

  async function openPdf() {
    setDownloading(true);
    try {
      const dl = await apiFetch<PyqPaperDownload>(`/student/my-papers/${initial.id}/download`);
      window.open(dl.url, '_blank', 'noreferrer');
    } catch (e) {
      alert((e as ApiError).message);
    } finally {
      setDownloading(false);
    }
  }

  async function startPractice() {
    setError(null);
    setBusy(true);
    try {
      const started = await apiFetch<{ attemptId: string; questionCount: number }>(`/student/my-papers/${initial.id}/attempts`, { method: 'POST' });
      setAttemptId(started.attemptId);
      setAnswers({});
      setMode('take');
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!attemptId) return;
    setBusy(true);
    try {
      const res = await apiFetch<StudentPaperAttemptResult>(`/student/my-papers/attempts/${attemptId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      });
      setResult(res);
      setMode('result');
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'result' && result) {
    return (
      <div className="grid gap-4">
        <div className="rounded-[15px] border border-line bg-white p-5 text-center">
          {result.score !== null ? (
            <>
              <div className="text-[10px] font-black uppercase text-muted">{L('आपका स्कोर', 'Your score')}</div>
              <div className="mt-1 text-3xl font-black text-navy-950">{result.score}/{result.maxScore}</div>
            </>
          ) : (
            <div className="text-sm font-bold text-ink">{L('जमा हो गया — कोई उत्तर कुंजी नहीं थी, इसलिए इसे खुद जाँचें।', 'Submitted — no answer key was set, so review it yourself against the paper.')}</div>
          )}
        </div>
        <Button type="button" onClick={() => setMode('view')}>{L('वापस जाएँ', 'Back')}</Button>
      </div>
    );
  }

  if (mode === 'take') {
    const count = initial.questionCount ?? 0;
    return (
      <div className="grid gap-4">
        <p className="text-xs text-muted">{L('पेपर खोलें और हर सवाल का जवाब नीचे भरें।', 'Open the paper and fill your answer for each question below.')}</p>
        <button type="button" onClick={() => void openPdf()} disabled={downloading} className="justify-self-start rounded-md border border-line bg-white px-3 py-2 text-xs font-bold text-navy-900 hover:bg-surface-soft">
          📄 {L('पेपर खोलें', 'Open paper')}
        </button>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
            <label key={n} className="rounded-md border border-line bg-white p-2 text-center">
              <div className="text-[9px] font-black text-muted">{n}</div>
              <input
                className="mt-1 w-full rounded border border-line px-1 py-1 text-center text-xs"
                maxLength={3}
                value={answers[n] ?? ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [n]: e.target.value.toUpperCase() }))}
              />
            </label>
          ))}
        </div>
        {error ? <p className="text-xs font-bold text-danger">{error}</p> : null}
        <div className="flex gap-2">
          <Button type="button" loading={busy} onClick={() => void submit()}>{L('जमा करें', 'Submit')}</Button>
          <button type="button" onClick={() => setMode('view')} className="rounded-md px-3 py-2 text-xs font-bold text-muted hover:bg-surface-soft">{L('रद्द करें', 'Cancel')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-[15px] border border-line bg-white p-4">
        <div className="flex items-center gap-2">
          {initial.year ? <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[9px] font-black text-muted">{initial.year}</span> : null}
          {initial.hasAnswerKey ? <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[9px] font-black text-teal-600">{L('उत्तर कुंजी है', 'Has answer key')}</span> : null}
        </div>
        {initial.questionCount ? <p className="mt-2 text-sm text-muted">{initial.questionCount} {L('सवाल', 'questions')}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => void openPdf()} disabled={downloading} className="rounded-md border border-line bg-white px-3 py-2 text-xs font-bold text-navy-900 hover:bg-surface-soft">
            📄 {L('पेपर खोलें', 'Open paper')}
          </button>
          {initial.questionCount ? (
            <Button type="button" loading={busy} onClick={() => void startPractice()}>
              ⏱ {L('समयबद्ध अभ्यास शुरू करें', 'Start timed practice')}
            </Button>
          ) : (
            <p className="text-[10.5px] text-muted">{L('अभ्यास शुरू करने के लिए पहले सवालों की संख्या या उत्तर कुंजी सेट करें।', 'Set a question count or answer key before you can practice.')}</p>
          )}
        </div>
        {error ? <p className="mt-2 text-xs font-bold text-danger">{error}</p> : null}
      </div>
    </div>
  );
}
