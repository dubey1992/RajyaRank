'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import type { CustomTopicView, StudyGoals, StudyPlanAccessStatus, StudyPlanDay } from '@rajyarank/contracts';
import { trackEvent } from '@/lib/analytics';
import { StudyPlanSetup } from './StudyPlanSetup';

const STATUS_TONE: Record<string, string> = {
  DONE: 'bg-teal-100 text-teal-600',
  SKIPPED: 'bg-line text-muted',
  MISSED: 'bg-[#fde8e8] text-danger',
  RESCHEDULED: 'bg-line text-muted',
  PENDING: 'bg-orange-100 text-orange-600',
};

const MISTAKE_TONE: Record<string, { hi: string; en: string; tone: string }> = {
  CONCEPT_GAP: { hi: 'कॉन्सेप्ट गैप ठीक करें', en: 'Concept-gap fix', tone: 'bg-[#fff1f2] text-danger' },
  SLOW_CALCULATION: { hi: 'धीमी गणना ड्रिल', en: 'Slow-calc drill', tone: 'bg-orange-100 text-orange-600' },
  GUESSING: { hi: 'अंदाज़ा जाँच', en: 'Guessing check', tone: 'bg-[#f1e9ff] text-[#7c3aed]' },
  MISREAD: { hi: 'लापरवाही सुधार', en: 'Careless-mistake fix', tone: 'bg-teal-100 text-teal-600' },
};

export function StudyPlanWeekView({
  initial,
  initialGoals,
  initialTopics,
  initialAccessStatus,
  locale,
}: {
  initial: StudyPlanDay[];
  initialGoals: StudyGoals | null;
  initialTopics: CustomTopicView[];
  initialAccessStatus: StudyPlanAccessStatus | null;
  locale: 'hi' | 'en';
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const router = useRouter();
  const [days, setDays] = useState(initial);
  const [selected, setSelected] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [accessStatus, setAccessStatus] = useState(initialAccessStatus);
  const [showPaywall, setShowPaywall] = useState(false);
  // First-task-completed fires once per session, the first time any DONE
  // mark succeeds — not on every completion. Seeded from the server-fetched
  // initial state so a student who already has history never re-fires it.
  const hasCompletedBefore = useRef(initial.some((d) => d.items.some((it) => it.status === 'DONE')));

  // A student's own custom topics only, beyond the free limit — catalog
  // lessons/drills are paid for via course entitlement already and are never
  // gated here. Mirrors assertCustomActionAllowed() server-side exactly, so
  // the UI shows the locked state upfront instead of waiting for a 409.
  const customActionsLocked = !!accessStatus && accessStatus.customTopicCount >= accessStatus.freeTopicLimit && !accessStatus.hasActiveSubscription;

  const day = days[selected];
  const weekdayFmt = new Intl.DateTimeFormat(hi ? 'hi-IN' : 'en-IN', { weekday: 'short' });
  const dateFmt = new Intl.DateTimeFormat(hi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short' });

  async function refetchWeek() {
    const [week, status] = await Promise.all([
      apiFetch<StudyPlanDay[]>('/student/study-plan/week').catch(() => null),
      apiFetch<StudyPlanAccessStatus>('/student/study-plan/access-status').catch(() => null),
    ]);
    if (week) setDays(week);
    if (status) setAccessStatus(status);
  }

  function handleError(e: unknown) {
    const err = e as ApiError;
    if (err.code === 'SUBSCRIPTION_REQUIRED') setShowPaywall(true);
    else alert(err.message);
  }

  async function mark(itemId: string, status: 'DONE' | 'SKIPPED') {
    setBusyId(itemId);
    try {
      await apiFetch(`/student/study-plan/items/${itemId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setDays((prev) => prev.map((d, i) => (i !== selected ? d : { ...d, items: d.items.map((it) => (it.id === itemId ? { ...it, status } : it)) })));
      if (status === 'DONE' && !hasCompletedBefore.current) {
        hasCompletedBefore.current = true;
        trackEvent('first_task_completed');
      }
    } catch (e) {
      handleError(e);
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
      handleError(e);
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
      <StudyPlanSetup
        initialGoals={initialGoals}
        initialTopics={initialTopics}
        accessStatus={accessStatus}
        locale={locale}
        onChanged={() => void refetchWeek()}
        onPaywall={() => setShowPaywall(true)}
      />

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
          {L('इस दिन के लिए कोई अध्ययन योजना आइटम नहीं। ऊपर अपने विषय जोड़ें।', 'No study plan items for this day — add your topics above.')}
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
                  {item.kind === 'MISTAKE_DRILL' && item.triggerMistakeType ? (
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${MISTAKE_TONE[item.triggerMistakeType]!.tone}`}>
                      {hi ? MISTAKE_TONE[item.triggerMistakeType]!.hi : MISTAKE_TONE[item.triggerMistakeType]!.en}
                    </span>
                  ) : null}
                  {item.kind === 'CUSTOM' ? (
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[9px] font-black text-teal-600">{L('मेरा विषय', 'My topic')}</span>
                  ) : null}
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${STATUS_TONE[item.status] ?? STATUS_TONE.PENDING}`}>{item.status}</span>
                </div>
                <div className="mt-1 truncate text-[13px] font-extrabold text-ink">{hi ? item.titleHi : item.titleEn}</div>
                {item.noteText ? <div className="mt-0.5 truncate text-[10.5px] text-muted" title={item.noteText}>{item.noteText}</div> : null}
                <div className="mt-0.5 text-[10px] text-muted">{item.estimatedMinutes} {L('मिनट', 'min')}</div>
              </div>
              <div className="flex items-center gap-2">
                {item.status === 'PENDING' && item.kind === 'CUSTOM' && customActionsLocked ? (
                  <button type="button" onClick={() => setShowPaywall(true)} className="rounded-md border border-orange-300 bg-orange-50 px-2.5 py-1.5 text-[10px] font-bold text-orange-600 hover:bg-orange-100">
                    🔒 {L('सब्सक्राइब करें', 'Subscribe to continue')}
                  </button>
                ) : item.status === 'PENDING' && reschedulingId === item.id ? (
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
                {item.resourceUrl ? (
                  <a href={item.resourceUrl} target="_blank" rel="noreferrer" className="text-[10.5px] font-black text-orange-600">
                    {item.resourceLabel || L('रिसोर्स', 'Resource')} →
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={showPaywall}
        title={L('सदस्यता योजना चाहिए', 'A subscription plan is needed')}
        message={L(
          `आपने मुफ़्त योजना की सीमा (${accessStatus?.freeTopicLimit ?? 3} विषय) का उपयोग कर लिया है। अपनी व्यक्तिगत स्टडी प्लान पर काम जारी रखने के लिए सदस्यता लें।`,
          `You've used up the free plan's limit (${accessStatus?.freeTopicLimit ?? 3} topics). Subscribe to keep working on your personal study plan.`,
        )}
        confirmLabel={L('योजनाएं देखें', 'View plans')}
        cancelLabel={L('रद्द करें', 'Cancel')}
        onCancel={() => setShowPaywall(false)}
        onConfirm={() => router.push(`/${locale}/pricing`)}
      />
    </div>
  );
}
