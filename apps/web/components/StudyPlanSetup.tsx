'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Field } from '@rajyarank/ui';
import type { CustomTopicView, StudyGoals, StudyPlanAccessStatus } from '@rajyarank/contracts';
import { apiFetch, type ApiError } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { getStoredAttribution } from '@/lib/attribution';

interface Exam { id: string; nameHi: string; nameEn: string }

const inputCls = 'mb-3 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-500';

/**
 * The "Create my study plan" entry point this whole feature is built around:
 * goal capture (a catalog exam OR a free-text one the student typed
 * themselves) plus a private topics workspace (one-by-one or pasted as a
 * syllabus list), each with an optional module label, note, and resource
 * link. Lives on /study-plan rather than a separate page/onboarding detour —
 * reuses that page's existing today/week view below it unchanged.
 */
export function StudyPlanSetup({
  initialGoals,
  initialTopics,
  accessStatus,
  locale,
  onChanged,
  onPaywall,
}: {
  initialGoals: StudyGoals | null;
  initialTopics: CustomTopicView[];
  accessStatus: StudyPlanAccessStatus | null;
  locale: 'hi' | 'en';
  onChanged: () => void;
  onPaywall: () => void;
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  // Tracks the server's current view of the goal, re-synced from
  // updateGoals()'s own response on save (it already returns the fresh
  // resolved StudyGoals, including targetExamName*) — initialGoals is only
  // ever the page-load snapshot and must never be read again after a save,
  // or the summary view below renders stale/blank text.
  const [savedGoals, setSavedGoals] = useState(initialGoals);
  const hasGoal = !!(savedGoals?.targetExamId || savedGoals?.customExamName);
  const [editingGoal, setEditingGoal] = useState(!hasGoal);
  const [exams, setExams] = useState<Exam[]>([]);
  const [examMode, setExamMode] = useState<'catalog' | 'custom'>(initialGoals?.customExamName ? 'custom' : 'catalog');
  const [targetExamId, setTargetExamId] = useState(initialGoals?.targetExamId ?? '');
  const [customExamName, setCustomExamName] = useState(initialGoals?.customExamName ?? '');
  const [dailyStudyMinutes, setDailyStudyMinutes] = useState(initialGoals?.dailyStudyMinutes ?? 60);
  const [targetDate, setTargetDate] = useState(initialGoals?.targetDate ? initialGoals.targetDate.slice(0, 10) : '');
  const [goalBusy, setGoalBusy] = useState(false);
  const [goalError, setGoalError] = useState<string | null>(null);

  const [topics, setTopics] = useState(initialTopics);
  const [addingTopic, setAddingTopic] = useState(false);
  const [topicName, setTopicName] = useState('');
  const [topicModule, setTopicModule] = useState('');
  const [topicNote, setTopicNote] = useState('');
  const [topicResourceUrl, setTopicResourceUrl] = useState('');
  const [topicResourceLabel, setTopicResourceLabel] = useState('');
  const [topicBusy, setTopicBusy] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);

  const [pasting, setPasting] = useState(false);
  const [pasteModule, setPasteModule] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [pasteBusy, setPasteBusy] = useState(false);

  // topics.length (local, updated optimistically on every add) rather than
  // accessStatus.customTopicCount (only refreshed after onChanged's refetch)
  // so the lock reflects the count the student can actually see right now.
  const freeLimit = accessStatus?.freeTopicLimit ?? null;
  const subscribed = accessStatus?.hasActiveSubscription ?? true; // assume unlocked while status hasn't loaded yet
  const atTopicLimit = freeLimit !== null && !subscribed && topics.length >= freeLimit;

  useEffect(() => {
    if (examMode === 'catalog' && exams.length === 0) {
      void apiFetch<Exam[]>('/exams').then(setExams).catch(() => undefined);
    }
  }, [examMode, exams.length]);

  async function saveGoal() {
    setGoalError(null);
    if (examMode === 'catalog' && !targetExamId) return setGoalError(L('कृपया एक परीक्षा चुनें।', 'Please select an exam.'));
    if (examMode === 'custom' && customExamName.trim().length < 2) return setGoalError(L('कृपया परीक्षा का नाम दर्ज करें।', 'Please enter the exam name.'));
    setGoalBusy(true);
    try {
      const updated = await apiFetch<StudyGoals>('/student/profile/goals', {
        method: 'PATCH',
        body: JSON.stringify({
          targetExamId: examMode === 'catalog' ? targetExamId : null,
          customExamName: examMode === 'custom' ? customExamName.trim() : null,
          dailyStudyMinutes,
          targetDate: targetDate ? new Date(`${targetDate}T00:00:00Z`).toISOString() : null,
        }),
      });
      setSavedGoals(updated);
      if (!hasGoal) {
        const attribution = getStoredAttribution();
        trackEvent('study_plan_created', {
          exam_source: examMode,
          daily_minutes: dailyStudyMinutes,
          ...(attribution.utmSource ? { utm_source: attribution.utmSource } : {}),
          ...(attribution.utmMedium ? { utm_medium: attribution.utmMedium } : {}),
          ...(attribution.utmCampaign ? { utm_campaign: attribution.utmCampaign } : {}),
        });
      }
      setEditingGoal(false);
      onChanged();
    } catch (e) {
      setGoalError((e as ApiError).message);
    } finally {
      setGoalBusy(false);
    }
  }

  async function addTopic() {
    setTopicError(null);
    if (!topicName.trim()) return setTopicError(L('कृपया विषय का नाम दर्ज करें।', 'Please enter a topic name.'));
    setTopicBusy(true);
    try {
      const created = await apiFetch<CustomTopicView>('/student/study-plan/custom-topics', {
        method: 'POST',
        body: JSON.stringify({
          name: topicName.trim(),
          moduleName: topicModule.trim() || undefined,
          noteText: topicNote.trim() || undefined,
          resourceUrl: topicResourceUrl.trim() || undefined,
          resourceLabel: topicResourceLabel.trim() || undefined,
        }),
      });
      setTopics((prev) => [...prev, created]);
      setTopicName(''); setTopicModule(''); setTopicNote(''); setTopicResourceUrl(''); setTopicResourceLabel('');
      setAddingTopic(false);
      onChanged();
    } catch (e) {
      const err = e as ApiError;
      if (err.code === 'SUBSCRIPTION_REQUIRED') { setAddingTopic(false); onPaywall(); }
      else setTopicError(err.message);
    } finally {
      setTopicBusy(false);
    }
  }

  async function submitPaste() {
    const names = pasteText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!names.length) return;
    setPasteBusy(true);
    try {
      const all = await apiFetch<CustomTopicView[]>('/student/study-plan/custom-topics/bulk', {
        method: 'POST',
        body: JSON.stringify({ moduleName: pasteModule.trim() || undefined, names }),
      });
      setTopics(all);
      setPasteText(''); setPasteModule(''); setPasting(false);
      onChanged();
    } catch (e) {
      const err = e as ApiError;
      if (err.code === 'SUBSCRIPTION_REQUIRED') { setPasting(false); onPaywall(); }
      else alert(err.message);
    } finally {
      setPasteBusy(false);
    }
  }

  async function removeTopic(id: string) {
    if (!confirm(L('यह विषय हटाएँ?', 'Remove this topic?'))) return;
    try {
      await apiFetch(`/student/study-plan/custom-topics/${id}`, { method: 'DELETE' });
      setTopics((prev) => prev.filter((t) => t.id !== id));
      onChanged();
    } catch (e) {
      alert((e as ApiError).message);
    }
  }

  const goalSummary = savedGoals?.customExamName
    ? savedGoals.customExamName
    : savedGoals?.targetExamNameEn
      ? (hi ? savedGoals.targetExamNameHi : savedGoals.targetExamNameEn)
      : null;

  return (
    <div className="mb-6 grid gap-4">
      <div className="rounded-[15px] border border-line bg-white p-4">
        {!editingGoal && hasGoal ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase text-muted">{L('आपका लक्ष्य', 'Your goal')}</div>
              <div className="mt-0.5 text-sm font-extrabold text-ink">{goalSummary}</div>
              <div className="mt-0.5 text-[11px] text-muted">
                {savedGoals?.dailyStudyMinutes} {L('मिनट/दिन', 'min/day')}
                {savedGoals?.targetDate ? ` · ${L('लक्ष्य तिथि', 'target')} ${new Date(savedGoals.targetDate).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short' })}` : ''}
              </div>
            </div>
            <button type="button" onClick={() => setEditingGoal(true)} className="rounded-md border border-line px-3 py-1.5 text-[11px] font-bold text-navy-900 hover:bg-surface-soft">
              {L('बदलें', 'Edit')}
            </button>
          </div>
        ) : (
          <div>
            <h2 className="mb-3 text-sm font-black text-navy-950">{L('अपनी स्टडी प्लान बनाएँ', 'Create my study plan')}</h2>
            <div className="mb-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setExamMode('catalog')} className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${examMode === 'catalog' ? 'bg-orange-500 text-white' : 'border border-line text-muted'}`}>
                {L('सूची से चुनें', 'Pick from list')}
              </button>
              <button type="button" onClick={() => setExamMode('custom')} className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${examMode === 'custom' ? 'bg-orange-500 text-white' : 'border border-line text-muted'}`}>
                {L('अपना परीक्षा नाम लिखें', 'Type your own exam')}
              </button>
            </div>
            {examMode === 'catalog' ? (
              <select className={inputCls} value={targetExamId} onChange={(e) => setTargetExamId(e.target.value)}>
                <option value="">{L('परीक्षा चुनें', 'Select exam')}</option>
                {exams.map((e) => <option key={e.id} value={e.id}>{hi ? e.nameHi : e.nameEn}</option>)}
              </select>
            ) : (
              <input className={inputCls} placeholder={L('जैसे: मेरी राज्य PSC परीक्षा', 'e.g. My State PSC exam')} value={customExamName} onChange={(e) => setCustomExamName(e.target.value)} />
            )}
            <Field label={L('रोज़ कितने मिनट पढ़ेंगे?', 'Daily study minutes')} name="dailyMinutes" type="number" min={15} max={720} value={dailyStudyMinutes} onChange={(e) => setDailyStudyMinutes(Number(e.target.value))} />
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-xs font-extrabold text-ink">{L('लक्ष्य तिथि (वैकल्पिक)', 'Target date (optional)')}</span>
              <input type="date" className={inputCls} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </label>
            {goalError ? <p className="mb-2 text-xs font-bold text-danger">{goalError}</p> : null}
            <div className="flex gap-2">
              <Button type="button" loading={goalBusy} onClick={() => void saveGoal()}>{L('सहेजें', 'Save')}</Button>
              {hasGoal ? (
                <button type="button" onClick={() => setEditingGoal(false)} className="rounded-md px-3 py-2 text-xs font-bold text-muted hover:bg-surface-soft">
                  {L('रद्द करें', 'Cancel')}
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-[15px] border border-line bg-white p-4">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-black text-navy-950">{L('मेरे विषय', 'My topics')}</h2>
          <div className="flex flex-wrap gap-2">
            {atTopicLimit ? (
              <button type="button" onClick={onPaywall} className="rounded-md border border-orange-300 bg-orange-50 px-2.5 py-1.5 text-[11px] font-bold text-orange-600 hover:bg-orange-100">
                🔒 {L('और जोड़ने के लिए सब्सक्राइब करें', 'Subscribe to add more')}
              </button>
            ) : (
              <>
                <button type="button" onClick={() => setPasting((v) => !v)} className="rounded-md border border-line px-2.5 py-1.5 text-[11px] font-bold text-navy-900 hover:bg-surface-soft">
                  {L('सूची पेस्ट करें', 'Paste a list')}
                </button>
                <button type="button" onClick={() => setAddingTopic((v) => !v)} className="rounded-md bg-orange-500 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-orange-600">
                  + {L('विषय जोड़ें', 'Add topic')}
                </button>
              </>
            )}
          </div>
        </div>
        {freeLimit !== null && !subscribed ? (
          <p className="mb-3 text-[10.5px] font-bold text-muted">
            {L(`मुफ़्त योजना: ${topics.length}/${freeLimit} विषय इस्तेमाल हुए`, `Free plan: ${topics.length}/${freeLimit} topics used`)}
          </p>
        ) : null}

        {pasting ? (
          <div className="mb-4 rounded-xl border border-dashed border-line p-3">
            <input className={inputCls} placeholder={L('मॉड्यूल नाम (वैकल्पिक), जैसे: इतिहास', 'Module name (optional), e.g. History')} value={pasteModule} onChange={(e) => setPasteModule(e.target.value)} />
            <textarea
              className={`${inputCls} h-28`}
              placeholder={L('हर पंक्ति में एक विषय पेस्ट करें', 'Paste one topic per line')}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <label className="mb-3 block text-[10.5px] text-muted">
              {L('या एक .txt फ़ाइल अपलोड करें (हर पंक्ति में एक विषय):', 'Or upload a .txt file (one topic per line):')}{' '}
              <input
                type="file"
                accept=".txt,text/plain"
                className="text-[10.5px]"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setPasteText(String(reader.result ?? ''));
                  reader.readAsText(file);
                }}
              />
            </label>
            <Button type="button" loading={pasteBusy} onClick={() => void submitPaste()}>{L('जोड़ें', 'Add all')}</Button>
          </div>
        ) : null}

        {addingTopic ? (
          <div className="mb-4 rounded-xl border border-dashed border-line p-3">
            <input className={inputCls} placeholder={L('विषय का नाम', 'Topic name')} value={topicName} onChange={(e) => setTopicName(e.target.value)} autoFocus />
            <input className={inputCls} placeholder={L('मॉड्यूल (वैकल्पिक)', 'Module (optional)')} value={topicModule} onChange={(e) => setTopicModule(e.target.value)} />
            <textarea className={`${inputCls} h-20`} placeholder={L('नोट (वैकल्पिक)', 'Note (optional)')} value={topicNote} onChange={(e) => setTopicNote(e.target.value)} />
            <input className={inputCls} placeholder={L('रिसोर्स लिंक (वैकल्पिक)', 'Resource link (optional)')} value={topicResourceUrl} onChange={(e) => setTopicResourceUrl(e.target.value)} />
            {topicResourceUrl.trim() ? (
              <input className={inputCls} placeholder={L('लिंक का नाम', 'Link label')} value={topicResourceLabel} onChange={(e) => setTopicResourceLabel(e.target.value)} />
            ) : null}
            {topicError ? <p className="mb-2 text-xs font-bold text-danger">{topicError}</p> : null}
            <Button type="button" loading={topicBusy} onClick={() => void addTopic()}>{L('जोड़ें', 'Add')}</Button>
          </div>
        ) : null}

        {topics.length === 0 ? (
          <p className="text-xs text-muted">{L('अभी तक कोई विषय नहीं जोड़ा गया। अपने सिलेबस से विषय जोड़ें।', "No topics yet — add topics from your own syllabus.")}</p>
        ) : (
          <div className="grid gap-2">
            {topics.map((t) => (
              <div key={t.id} className="flex items-start justify-between gap-2 rounded-xl border border-line p-2.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {t.moduleName ? <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[9px] font-black text-muted">{t.moduleName}</span> : null}
                    {!t.scheduled ? <span className="rounded-full bg-[#fff1f2] px-2 py-0.5 text-[9px] font-black text-danger">{L('अभी शेड्यूल नहीं हुआ', 'Not yet scheduled')}</span> : null}
                  </div>
                  <div className="mt-0.5 truncate text-[13px] font-extrabold text-ink">{t.name}</div>
                  {t.resourceUrl ? (
                    <a href={t.resourceUrl} target="_blank" rel="noreferrer" className="mt-0.5 block text-[10.5px] font-bold text-orange-600 hover:underline">
                      {t.resourceLabel || L('रिसोर्स खोलें', 'Open resource')} →
                    </a>
                  ) : null}
                  <Link href={`/${locale}/my-quizzes?topic=${t.id}`} className="mt-0.5 block text-[10.5px] font-bold text-teal-600 hover:underline">
                    {L('प्रैक्टिस टेस्ट', 'Practice test')} →
                  </Link>
                </div>
                <button type="button" onClick={() => void removeTopic(t.id)} className="shrink-0 rounded-md px-2 py-1 text-[10px] font-bold text-muted hover:bg-surface-soft">
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
