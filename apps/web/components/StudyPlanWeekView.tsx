'use client';
import { useState } from 'react';
import Link from 'next/link';
import { apiFetch, type ApiError } from '@/lib/api';
import type { StudyPlanDay } from '@rajyarank/contracts';

const STATUS_TONE: Record<string, string> = {
  DONE: 'bg-teal-100 text-teal-600',
  SKIPPED: 'bg-line text-muted',
  MISSED: 'bg-[#fde8e8] text-danger',
  RESCHEDULED: 'bg-line text-muted',
  PENDING: 'bg-orange-100 text-orange-600',
};

export function StudyPlanWeekView({ initial, locale }: { initial: StudyPlanDay[]; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [days, setDays] = useState(initial);
  const [selected, setSelected] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const day = days[selected];
  const weekdayFmt = new Intl.DateTimeFormat(hi ? 'hi-IN' : 'en-IN', { weekday: 'short' });
  const dateFmt = new Intl.DateTimeFormat(hi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short' });

  async function refetchWeek() {
    const week = await apiFetch<StudyPlanDay[]>('/student/study-plan/week').catch(() => null);
    if (week) setDays(week);
  }

  async function mark(itemId: string, status: 'DONE' | 'SKIPPED') {
    setBusyId(itemId);
    try {
      await apiFetch(`/student/study-plan/items/${itemId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setDays((prev) => prev.map((d, i) => (i !== selected ? d : { ...d, items: d.items.map((it) => (it.id === itemId ? { ...it, status } : it)) })));
    } catch (e) {
      alert((e as ApiError).message);
    } finally {
      setBusyId(null);
    }
  }

  async function reschedule(itemId: string, toDate: string) {
    if (!toDate) return;
    setBusyId(itemId);
    try {
      await apiFetch(`/student/study-plan/items/${itemId}/reschedule`, { method: 'POST', body: JSON.stringify({ toDate: new Date(toDate).toISOString() }) });
      setReschedulingId(null);
      await refetchWeek();
    } catch (e) {
      alert((e as ApiError).message);
    } finally {
      setBusyId(null);
    }
  }

  async function regenerate() {
    setRegenerating(true);
    try {
      await apiFetch('/student/study-plan/regenerate', { method: 'POST' });
      await refetchWeek();
      setSelected(0);
    } catch (e) {
      alert((e as ApiError).message);
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button type="button" disabled={regenerating} onClick={() => void regenerate()} className="rounded-md border border-line bg-white px-3 py-2 text-xs font-bold text-navy-900 hover:bg-surface-soft disabled:opacity-50">
          {regenerating ? L('पुनर्निर्मित हो रहा है…', 'Regenerating…') : `↻ ${L('योजना पुनर्निर्मित करें', 'Regenerate plan')}`}
        </button>
      </div>
      <div className="mb-5 grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const date = new Date(`${d.date}T00:00:00Z`);
          const doneCount = d.items.filter((it) => it.status === 'DONE').length;
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => setSelected(i)}
              className={`rounded-xl border p-2.5 text-center transition ${i === selected ? 'border-orange-500 bg-orange-50' : 'border-line bg-white hover:bg-surface-soft'}`}
            >
              <div className="text-[9px] font-black uppercase text-muted">{i === 0 ? L('आज', 'Today') : weekdayFmt.format(date)}</div>
              <div className="mt-0.5 text-sm font-black text-navy-950">{dateFmt.format(date)}</div>
              {d.items.length ? <div className="mt-1 text-[9px] text-muted">{doneCount}/{d.items.length}</div> : null}
            </button>
          );
        })}
      </div>

      {!day || day.items.length === 0 ? (
        <p className="rounded-xl border border-line bg-white p-6 text-center text-sm text-muted">
          {L('इस दिन के लिए कोई अध्ययन योजना आइटम नहीं।', 'No study plan items for this day.')}
        </p>
      ) : (
        <div className="grid gap-2.5">
          {day.items.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[15px] border border-line bg-white p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {item.kind === 'WEAK_TOPIC_DRILL' ? (
                    <span className="rounded-full bg-[#f1e9ff] px-2 py-0.5 text-[9px] font-black text-[#7c3aed]">{L('फोकस क्षेत्र', 'Focus area')}</span>
                  ) : null}
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${STATUS_TONE[item.status] ?? STATUS_TONE.PENDING}`}>{item.status}</span>
                </div>
                <div className="mt-1 truncate text-[13px] font-extrabold text-ink">{hi ? item.titleHi : item.titleEn}</div>
                <div className="mt-0.5 text-[10px] text-muted">{item.estimatedMinutes} {L('मिनट', 'min')}</div>
              </div>
              <div className="flex items-center gap-2">
                {item.status === 'PENDING' && reschedulingId === item.id ? (
                  <input
                    type="date"
                    autoFocus
                    className="rounded-md border border-line px-2 py-1.5 text-[11px]"
                    onChange={(e) => void reschedule(item.id, e.target.value)}
                    onBlur={() => setReschedulingId(null)}
                  />
                ) : item.status === 'PENDING' ? (
                  <>
                    <button type="button" disabled={busyId === item.id} onClick={() => setReschedulingId(item.id)} className="rounded-md border border-line px-2.5 py-1.5 text-[10px] font-bold text-muted hover:bg-surface-soft disabled:opacity-50">
                      {L('टालें', 'Reschedule')}
                    </button>
                    <button type="button" disabled={busyId === item.id} onClick={() => void mark(item.id, 'SKIPPED')} className="rounded-md border border-line px-2.5 py-1.5 text-[10px] font-bold text-muted hover:bg-surface-soft disabled:opacity-50">
                      {L('छोड़ें', 'Skip')}
                    </button>
                    <button type="button" disabled={busyId === item.id} onClick={() => void mark(item.id, 'DONE')} className="rounded-md bg-teal-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-teal-700 disabled:opacity-50">
                      ✓ {L('पूर्ण', 'Done')}
                    </button>
                  </>
                ) : null}
                {item.lessonId ? (
                  <Link href={`/${locale}/learn/${item.lessonId}`} className="text-[10.5px] font-black text-orange-600">
                    {item.freePreview ? L('खोलें', 'Open') : L('अनलॉक', 'Unlock')} →
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
