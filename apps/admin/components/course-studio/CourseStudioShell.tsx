'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Field, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import type { CourseReadinessView } from '@rajyarank/contracts';
import { CurriculumBuilder, type CurriculumSubject } from './CurriculumBuilder';
import { CoursePricingPanel } from '../CoursePricingPanel';

interface Ref { id: string; code: string; nameHi: string; nameEn: string }

interface StudioCourse {
  id: string;
  code: string;
  stateId: string;
  examId: string;
  titleHi: string;
  titleEn: string;
  descHi: string | null;
  descEn: string | null;
  status: string;
  visibility: string;
  orgId: string | null;
  coursePromiseHi: string | null;
  coursePromiseEn: string | null;
  learningOutcomes: string[];
  recommendedDailyStudyMinutes: number | null;
  expectedCompletionDays: number | null;
  masteryThresholdPercent: number | null;
  prerequisitesHi: string | null;
  prerequisitesEn: string | null;
  subjects: CurriculumSubject[];
}

type Audience = 'INSTITUTE_ONLY' | 'PUBLIC_AND_INSTITUTE';

const ALL_STEPS = ['template', 'basics', 'audience', 'learningDesign', 'curriculum', 'content', 'pricing', 'review'] as const;
type Step = (typeof ALL_STEPS)[number];

const TEMPLATES: { key: string; hi: string; en: string; descHi: string; descEn: string }[] = [
  { key: 'COMPLETE', hi: 'पूर्ण कोर्स', en: 'Complete Course', descHi: 'विषयों, पाठों, परीक्षणों, रिवीज़न व सहायता के साथ पूर्ण परीक्षा तैयारी।', descEn: 'Full exam preparation with subjects, lessons, tests, revision and support.' },
  { key: 'SUBJECT', hi: 'विषय कोर्स', en: 'Subject Course', descHi: 'एक विषय पर केंद्रित तैयारी, अध्याय परीक्षणों व रिवीज़न सहित।', descEn: 'Focused preparation for one subject with chapter tests and revision.' },
  { key: 'CRASH', hi: 'क्रैश कोर्स', en: 'Crash Course', descHi: 'परीक्षा तिथि के निकट संक्षिप्त, उच्च-भारांक तैयारी।', descEn: 'Short, high-weightage preparation near the exam date.' },
  { key: 'TEST_SERIES', hi: 'टेस्ट सीरीज़', en: 'Test Series', descHi: 'सेक्शनल, विषय व पूर्ण मॉक टेस्ट के साथ विश्लेषण।', descEn: 'Sectional, subject and full mock tests with analytics.' },
  { key: 'FREE_STARTER', hi: 'निःशुल्क स्टार्टर कोर्स', en: 'Free Starter Course', descHi: 'अधिग्रहण हेतु नमूना पाठ, पीडीएफ़ व डेमो टेस्ट।', descEn: 'Sample lessons, a PDF and a demo test for acquisition.' },
  { key: 'BLANK', hi: 'रिक्त कोर्स', en: 'Blank Course', descHi: 'खाली पाठ्यक्रम से शुरू करें।', descEn: 'Start from an empty curriculum.' },
];

/** Unified Course Studio — replaces the previously separate course-creation
 *  wizard, curriculum tree page, content wizard's own pricing ask, and
 *  standalone pricing panel with ONE flow. Pricing is now asked in exactly
 *  one place (the Pricing step, which mounts CoursePricingPanel directly).
 *  Each step persists on "Next" (autosave-per-step), not deferred to a final
 *  submit — so leaving mid-flow never loses already-completed work. */
export function CourseStudioShell({
  mode,
  locale,
  isInstitute,
  courseId: initialCourseId,
  states = [],
  exams = [],
  webPublicUrl,
}: {
  mode: 'create' | 'edit';
  locale: 'hi' | 'en';
  isInstitute: boolean;
  courseId?: string;
  states?: Ref[];
  exams?: Ref[];
  webPublicUrl: string;
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const router = useRouter();

  const [courseId, setCourseId] = useState<string | null>(initialCourseId ?? null);
  const [course, setCourse] = useState<StudioCourse | null>(null);
  const [loading, setLoading] = useState(mode === 'edit');
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  const [templateKey, setTemplateKey] = useState('COMPLETE');

  const [code, setCode] = useState('');
  const [stateId, setStateId] = useState('');
  const [examId, setExamId] = useState('');
  const [titleHi, setTitleHi] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [descHi, setDescHi] = useState('');
  const [descEn, setDescEn] = useState('');
  const [basicsBusy, setBasicsBusy] = useState(false);

  const [audience, setAudience] = useState<Audience>('PUBLIC_AND_INSTITUTE');

  const [coursePromiseHi, setCoursePromiseHi] = useState('');
  const [coursePromiseEn, setCoursePromiseEn] = useState('');
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [dailyMinutes, setDailyMinutes] = useState('');
  const [completionDays, setCompletionDays] = useState('');
  const [masteryPct, setMasteryPct] = useState('70');
  const [prereqHi, setPrereqHi] = useState('');
  const [prereqEn, setPrereqEn] = useState('');
  const [designBusy, setDesignBusy] = useState(false);

  const [readiness, setReadiness] = useState<CourseReadinessView | null>(null);
  const [publishing, setPublishing] = useState(false);

  const steps: Step[] = ALL_STEPS.filter((s) => {
    if (s === 'template') return mode === 'create';
    if (s === 'audience') return isInstitute;
    return true;
  });
  const step = steps[Math.min(stepIndex, steps.length - 1)];

  // Audience has no persisted field of its own — it's only mapped to
  // `visibility` at publish time (Review step). Since `visibility` stays
  // PRIVATE right up until that publish action, re-deriving it from the
  // server on every refresh (e.g. after adding a curriculum item) would
  // silently clobber whatever the user picked in the Audience step. Derive
  // it from the server exactly once per mount, never again.
  const audienceHydrated = useRef(false);

  function hydrate(c: StudioCourse) {
    setCode(c.code); setStateId(c.stateId ?? ''); setExamId(c.examId ?? '');
    setTitleHi(c.titleHi); setTitleEn(c.titleEn); setDescHi(c.descHi ?? ''); setDescEn(c.descEn ?? '');
    if (!audienceHydrated.current) {
      setAudience(c.orgId && c.visibility === 'PRIVATE' ? 'INSTITUTE_ONLY' : 'PUBLIC_AND_INSTITUTE');
      audienceHydrated.current = true;
    }
    setCoursePromiseHi(c.coursePromiseHi ?? ''); setCoursePromiseEn(c.coursePromiseEn ?? '');
    setOutcomes(c.learningOutcomes.length ? c.learningOutcomes : ['']);
    setDailyMinutes(c.recommendedDailyStudyMinutes ? String(c.recommendedDailyStudyMinutes) : '');
    setCompletionDays(c.expectedCompletionDays ? String(c.expectedCompletionDays) : '');
    setMasteryPct(c.masteryThresholdPercent ? String(c.masteryThresholdPercent) : '70');
    setPrereqHi(c.prerequisitesHi ?? ''); setPrereqEn(c.prerequisitesEn ?? '');
  }

  async function loadCourse(id: string) {
    setLoading(true);
    try {
      const c = await apiFetch<StudioCourse>(`/admin/courses/${id}`);
      setCourse(c);
      hydrate(c);
    } catch (e) {
      setError((e as ApiError).message ?? L('कोर्स लोड करना विफल रहा।', 'Failed to load course.'));
    } finally {
      setLoading(false);
    }
  }

  async function loadReadiness(id: string) {
    try {
      setReadiness(await apiFetch<CourseReadinessView>(`/admin/courses/${id}/readiness`));
    } catch {
      setReadiness(null);
    }
  }

  useEffect(() => {
    if (initialCourseId) void loadCourse(initialCourseId);
  }, [initialCourseId]);

  useEffect(() => {
    if (courseId && (step === 'content' || step === 'review')) void loadReadiness(courseId);
  }, [courseId, step]);

  function canAdvance(): boolean {
    if (step === 'basics') return /^[A-Z0-9_]{2,40}$/.test(code) && !!stateId && !!examId && titleHi.trim().length >= 2 && titleEn.trim().length >= 2;
    return true;
  }

  async function goNext() {
    if (!canAdvance()) return;
    setError(null);

    if (step === 'basics') {
      setBasicsBusy(true);
      try {
        if (!courseId) {
          const created = await apiFetch<{ id: string }>('/admin/courses', {
            method: 'POST',
            body: JSON.stringify({ code, stateId, examId, titleHi: titleHi.trim(), titleEn: titleEn.trim(), ...(descHi ? { descHi } : {}), ...(descEn ? { descEn } : {}) }),
          });
          setCourseId(created.id);
          await loadCourse(created.id);
          setToast(L('कोर्स बनाया गया — अब बाकी चरण इसी पर लागू होंगे।', 'Course created — the rest of the steps now apply to it.'));
        } else {
          await apiFetch(`/admin/courses/${courseId}`, {
            method: 'PATCH',
            body: JSON.stringify({ titleHi: titleHi.trim(), titleEn: titleEn.trim(), ...(descHi ? { descHi } : {}), ...(descEn ? { descEn } : {}) }),
          });
          setToast(L('सहेजा गया।', 'Saved.'));
        }
      } catch (e) {
        setError((e as ApiError).message ?? L('सहेजना विफल रहा।', 'Save failed.'));
        setBasicsBusy(false);
        return;
      }
      setBasicsBusy(false);
    }

    if (step === 'learningDesign' && courseId) {
      setDesignBusy(true);
      try {
        await apiFetch(`/admin/courses/${courseId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            ...(coursePromiseHi ? { coursePromiseHi } : {}),
            ...(coursePromiseEn ? { coursePromiseEn } : {}),
            learningOutcomes: outcomes.map((o) => o.trim()).filter(Boolean),
            ...(dailyMinutes ? { recommendedDailyStudyMinutes: Number(dailyMinutes) } : {}),
            ...(completionDays ? { expectedCompletionDays: Number(completionDays) } : {}),
            ...(masteryPct ? { masteryThresholdPercent: Number(masteryPct) } : {}),
            ...(prereqHi ? { prerequisitesHi: prereqHi } : {}),
            ...(prereqEn ? { prerequisitesEn: prereqEn } : {}),
          }),
        });
        setToast(L('सहेजा गया।', 'Saved.'));
      } catch (e) {
        setError((e as ApiError).message ?? L('सहेजना विफल रहा।', 'Save failed.'));
        setDesignBusy(false);
        return;
      }
      setDesignBusy(false);
    }

    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function publish() {
    if (!courseId) return;
    setPublishing(true); setError(null);
    try {
      const visibility = !isInstitute || audience === 'PUBLIC_AND_INSTITUTE' ? 'PUBLIC' : 'PRIVATE';
      await apiFetch(`/admin/courses/${courseId}`, { method: 'PATCH', body: JSON.stringify({ status: 'ACTIVE', visibility }) });
      setToast(L('कोर्स प्रकाशित किया गया।', 'Course published.'));
      await loadCourse(courseId);
      await loadReadiness(courseId);
    } catch (e) {
      setError((e as ApiError).message ?? L('प्रकाशित करना विफल रहा।', 'Publish failed.'));
    } finally {
      setPublishing(false);
    }
  }

  async function openStudentPreview() {
    if (!courseId) return;
    setPreviewBusy(true); setError(null);
    try {
      const { token } = await apiFetch<{ token: string }>(`/admin/courses/${courseId}/preview-token`, { method: 'POST' });
      window.open(`${webPublicUrl}/${locale}/courses/${courseId}?previewToken=${encodeURIComponent(token)}`, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError((e as ApiError).message ?? L('पूर्वावलोकन खोलना विफल रहा।', 'Failed to open preview.'));
    } finally {
      setPreviewBusy(false);
    }
  }

  const STEP_LABELS: Record<Step, string> = {
    template: L('1. टेम्पलेट', '1. Template'),
    basics: L('2. बुनियादी जानकारी', '2. Basics'),
    audience: L('3. दर्शक', '3. Audience'),
    learningDesign: L('4. शिक्षण डिज़ाइन', '4. Learning design'),
    curriculum: L('5. पाठ्यक्रम', '5. Curriculum'),
    content: L('6. कंटेंट', '6. Content'),
    pricing: L('7. मूल्य निर्धारण', '7. Pricing'),
    review: L('8. समीक्षा', '8. Review'),
  };

  const lessons = (course?.subjects ?? []).flatMap((s) => s.chapters.flatMap((c) => c.topics.flatMap((t) => t.lessons)));
  const publishedLessons = lessons.filter((l) => l.currentVersion?.status === 'PUBLISHED');

  if (loading) return <p className="text-sm text-muted">{L('लोड हो रहा है…', 'Loading…')}</p>;

  // Every completed step already autosaves (see goNext()), so there's
  // nothing extra to persist here — this just gives leaving mid-flow a
  // clearly labeled, always-visible exit instead of the "Go to course list"
  // button that used to exist only on the final Review step.
  function saveAndExit() {
    router.push(`/${locale}/admin/courses`);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ol className="flex flex-wrap gap-2 text-xs font-bold">
          {steps.map((s, i) => (
            <li key={s} className={`rounded-full px-2.5 py-1.5 ${i === stepIndex ? 'bg-navy-950 text-white' : i < stepIndex ? 'bg-teal-100 text-success' : 'bg-line text-muted'}`}>
              {STEP_LABELS[s]}
            </li>
          ))}
        </ol>
        <button type="button" onClick={saveAndExit} className="text-xs font-bold text-navy-900 hover:underline">
          {L('सहेजें और बाहर निकलें', 'Save & Exit')}
        </button>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="rounded-lg border border-line bg-white p-5">
        {step === 'template' ? (
          <div className="grid gap-3">
            <p className="text-sm text-muted">{L('टेम्पलेट पाठ्यक्रम की शुरुआती दिशा तय करता है — बाद में कुछ भी बदला जा सकता है।', 'The template just sets a starting direction — everything can be changed later.')}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTemplateKey(t.key)}
                  className={`rounded-md border p-3 text-left ${templateKey === t.key ? 'border-orange-500 bg-orange-50' : 'border-line'}`}
                >
                  <b className="block text-sm text-ink">{L(t.hi, t.en)}</b>
                  <span className="text-xs text-muted">{L(t.descHi, t.descEn)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 'basics' ? (
          <div className="grid gap-3">
            <Field label={L('कोड', 'Code')} name="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} disabled={!!courseId} />
            {!courseId ? (
              <>
                <label className="mb-1 block text-sm font-extrabold text-ink">{L('राज्य', 'State')}</label>
                <select value={stateId} onChange={(e) => setStateId(e.target.value)} className="mb-2 w-full rounded-md border border-line px-3 py-3 text-sm">
                  <option value="">{L('राज्य चुनें…', 'Select state…')}</option>
                  {states.map((s) => <option key={s.id} value={s.id}>{hi ? s.nameHi : s.nameEn}</option>)}
                </select>
                <label className="mb-1 block text-sm font-extrabold text-ink">{L('परीक्षा', 'Exam')}</label>
                <select value={examId} onChange={(e) => setExamId(e.target.value)} className="mb-2 w-full rounded-md border border-line px-3 py-3 text-sm">
                  <option value="">{L('परीक्षा चुनें…', 'Select exam…')}</option>
                  {exams.map((x) => <option key={x.id} value={x.id}>{hi ? x.nameHi : x.nameEn}</option>)}
                </select>
              </>
            ) : (
              <p className="text-xs text-muted">{L('राज्य व परीक्षा बनने के बाद नहीं बदले जा सकते।', 'State and exam cannot be changed after creation.')}</p>
            )}
            <Field label={L('शीर्षक (हिन्दी)', 'Title (Hindi)')} name="titleHi" value={titleHi} onChange={(e) => setTitleHi(e.target.value)} />
            <Field label={L('शीर्षक (English)', 'Title (English)')} name="titleEn" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
            <label className="mb-1 block text-sm font-extrabold text-ink" htmlFor="descHi">{L('विवरण (हिन्दी, वैकल्पिक)', 'Description (Hindi, optional)')}</label>
            <textarea id="descHi" value={descHi} onChange={(e) => setDescHi(e.target.value)} className="mb-2 min-h-[70px] w-full rounded-md border border-line px-3 py-2 text-sm" />
            <label className="mb-1 block text-sm font-extrabold text-ink" htmlFor="descEn">{L('विवरण (English, वैकल्पिक)', 'Description (English, optional)')}</label>
            <textarea id="descEn" value={descEn} onChange={(e) => setDescEn(e.target.value)} className="min-h-[70px] w-full rounded-md border border-line px-3 py-2 text-sm" />
          </div>
        ) : null}

        {step === 'audience' ? (
          <div className="grid gap-3">
            <p className="text-xs text-muted">{L('यह कोर्स किसे बेचा जाए?', 'Who should be able to buy this course?')}</p>
            <button type="button" onClick={() => setAudience('INSTITUTE_ONLY')} className={`rounded-md border p-4 text-left ${audience === 'INSTITUTE_ONLY' ? 'border-orange-500 bg-orange-50' : 'border-line'}`}>
              <b className="block text-sm text-ink">{L('केवल संस्थान', 'Institute only')}</b>
              <span className="text-xs text-muted">{L('केवल आपके संस्थान के नामांकित छात्र इसे देख/खरीद सकते हैं। सार्वजनिक कैटलॉग में नहीं दिखेगा।', 'Only your institute’s own enrolled students can see/buy it. Hidden from the public catalogue.')}</span>
            </button>
            <button type="button" onClick={() => setAudience('PUBLIC_AND_INSTITUTE')} className={`rounded-md border p-4 text-left ${audience === 'PUBLIC_AND_INSTITUTE' ? 'border-orange-500 bg-orange-50' : 'border-line'}`}>
              <b className="block text-sm text-ink">{L('सार्वजनिक + संस्थान', 'Public + Institute')}</b>
              <span className="text-xs text-muted">{L('सार्वजनिक कैटलॉग में बिकेगा; आपके संस्थान के छात्र वैकल्पिक कम मूल्य पर खरीद सकते हैं।', 'Sold on the public catalogue; your own institute’s students can buy at an optional lower price.')}</span>
            </button>
            <p className="text-xs text-muted">{L('यह चयन "समीक्षा" चरण में प्रकाशित करते समय लागू होता है।', 'This choice takes effect when you publish from the Review step.')}</p>
          </div>
        ) : null}

        {step === 'learningDesign' ? (
          <div className="grid gap-3">
            <label className="mb-1 block text-sm font-extrabold text-ink" htmlFor="promiseHi">{L('कोर्स वादा (हिन्दी)', 'Course promise (Hindi)')}</label>
            <textarea id="promiseHi" value={coursePromiseHi} onChange={(e) => setCoursePromiseHi(e.target.value)} className="mb-2 min-h-[60px] w-full rounded-md border border-line px-3 py-2 text-sm" />
            <label className="mb-1 block text-sm font-extrabold text-ink" htmlFor="promiseEn">{L('कोर्स वादा (English)', 'Course promise (English)')}</label>
            <textarea id="promiseEn" value={coursePromiseEn} onChange={(e) => setCoursePromiseEn(e.target.value)} className="mb-3 min-h-[60px] w-full rounded-md border border-line px-3 py-2 text-sm" />

            <div className="grid grid-cols-3 gap-3">
              <Field label={L('दैनिक अध्ययन (मिनट)', 'Daily study (minutes)')} name="dailyMinutes" inputMode="numeric" value={dailyMinutes} onChange={(e) => setDailyMinutes(e.target.value.replace(/\D/g, ''))} />
              <Field label={L('पूर्णता अवधि (दिन)', 'Completion period (days)')} name="completionDays" inputMode="numeric" value={completionDays} onChange={(e) => setCompletionDays(e.target.value.replace(/\D/g, ''))} />
              <Field label={L('निपुणता सीमा (%)', 'Mastery threshold (%)')} name="masteryPct" inputMode="numeric" value={masteryPct} onChange={(e) => setMasteryPct(e.target.value.replace(/\D/g, ''))} />
            </div>

            <Field label={L('पूर्वापेक्षाएँ (हिन्दी, वैकल्पिक)', 'Prerequisites (Hindi, optional)')} name="prereqHi" value={prereqHi} onChange={(e) => setPrereqHi(e.target.value)} />
            <Field label={L('पूर्वापेक्षाएँ (English, वैकल्पिक)', 'Prerequisites (English, optional)')} name="prereqEn" value={prereqEn} onChange={(e) => setPrereqEn(e.target.value)} />

            <div className="mt-1 flex items-center justify-between">
              <span className="text-sm font-extrabold text-ink">{L('सीखने के परिणाम', 'Learning outcomes')}</span>
              <button type="button" onClick={() => setOutcomes([...outcomes, ''])} className="text-xs font-bold text-navy-900">{L('+ परिणाम जोड़ें', '+ Add outcome')}</button>
            </div>
            <div className="grid gap-2">
              {outcomes.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={o}
                    onChange={(e) => setOutcomes(outcomes.map((x, j) => (j === i ? e.target.value : x)))}
                    placeholder={L('एक मापने योग्य परिणाम बताएँ', 'Describe a measurable course outcome')}
                    className="w-full rounded-md border border-line px-3 py-2 text-sm"
                  />
                  <button type="button" onClick={() => setOutcomes(outcomes.filter((_, j) => j !== i))} className="rounded-md border border-line px-2 py-2 text-xs font-bold text-danger">{L('हटाएँ', 'Remove')}</button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {step === 'curriculum' ? (
          courseId ? (
            <CurriculumBuilder
              courseId={courseId}
              courseTitleHi={course?.titleHi ?? titleHi}
              courseTitleEn={course?.titleEn ?? titleEn}
              subjects={course?.subjects ?? []}
              locale={locale}
              onChanged={() => void loadCourse(courseId)}
            />
          ) : null
        ) : null}

        {step === 'content' ? (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(['VIDEO', 'PDF', 'TEXT', 'MIXED'] as const).map((t) => (
                <div key={t} className="rounded-md border border-line p-3 text-center">
                  <div className="text-2xl font-black text-navy-900">{lessons.filter((l) => l.lessonType === t).length}</div>
                  <div className="text-xs text-muted">{t}</div>
                </div>
              ))}
            </div>
            <p className="text-sm text-ink">{L(`कुल पाठ: ${lessons.length} · प्रकाशित: ${publishedLessons.length}`, `Total lessons: ${lessons.length} · Published: ${publishedLessons.length}`)}</p>
            {readiness ? (
              <div>
                <p className="mb-2 text-sm font-extrabold text-ink">{L('न्यूनतम पूर्ण-कोर्स सूची', 'Minimum complete-course checklist')}</p>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {readiness.gates.map((g) => (
                    <li key={g.key} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold ${g.passed ? 'border-teal-200 bg-teal-50 text-success' : 'border-line text-muted'}`}>
                      <span>{g.passed ? '✓' : '○'}</span>
                      <span>{hi ? g.labelHi : g.labelEn}</span>
                      {g.hard ? <span className="ml-auto rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] text-orange-600">{L('आवश्यक', 'Required')}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 'pricing' ? (
          courseId ? <CoursePricingPanel courseId={courseId} locale={locale} hasOrg={!!course?.orgId} /> : null
        ) : null}

        {step === 'review' ? (
          <div className="grid gap-4">
            <dl className="grid gap-1 rounded-md border border-line bg-surface-soft p-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted">{L('कोड', 'Code')}</dt><dd className="font-bold text-ink">{course?.code ?? code}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">{L('शीर्षक', 'Title')}</dt><dd className="font-bold text-ink">{hi ? course?.titleHi ?? titleHi : course?.titleEn ?? titleEn}</dd></div>
              {isInstitute ? <div className="flex justify-between"><dt className="text-muted">{L('दर्शक', 'Audience')}</dt><dd className="font-bold text-ink">{audience === 'INSTITUTE_ONLY' ? L('केवल संस्थान', 'Institute only') : L('सार्वजनिक + संस्थान', 'Public + Institute')}</dd></div> : null}
              <div className="flex justify-between"><dt className="text-muted">{L('विषय', 'Subjects')}</dt><dd className="font-bold text-ink">{course?.subjects.length ?? 0}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">{L('पाठ (प्रकाशित)', 'Lessons (published)')}</dt><dd className="font-bold text-ink">{lessons.length} ({publishedLessons.length})</dd></div>
              <div className="flex justify-between"><dt className="text-muted">{L('स्थिति', 'Status')}</dt><dd className="font-bold text-ink">{course?.status} · {course?.visibility}</dd></div>
            </dl>

            {readiness ? (
              <div>
                <p className="mb-2 text-sm font-extrabold text-ink">{L('प्रकाशन तैयारी', 'Publish readiness')} — {readiness.percent}%</p>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {readiness.gates.map((g) => (
                    <li key={g.key} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold ${g.passed ? 'border-teal-200 bg-teal-50 text-success' : 'border-line text-muted'}`}>
                      <span>{g.passed ? '✓' : '○'}</span>
                      <span>{hi ? g.labelHi : g.labelEn}</span>
                      {g.hard ? <span className="ml-auto rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] text-orange-600">{L('आवश्यक', 'Required')}</span> : null}
                    </li>
                  ))}
                </ul>
                {!readiness.hardGatesPassed ? (
                  <div className="mt-3 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700">
                    {L('प्रकाशन अवरुद्ध: ऊपर "आवश्यक" चिह्नित सभी बिंदु पूरे करें।', 'Publishing blocked: complete every point marked "Required" above.')}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => void publish()} loading={publishing} disabled={!readiness?.hardGatesPassed || course?.status === 'ACTIVE'} className="text-sm">
                {course?.status === 'ACTIVE' && course?.visibility === 'PUBLIC' ? L('प्रकाशित ✓', 'Published ✓') : L('प्रकाशित करें (ACTIVE + PUBLIC)', 'Publish (set ACTIVE + PUBLIC)')}
              </Button>
              <Button variant="outline" onClick={() => void openStudentPreview()} loading={previewBusy} className="text-sm">
                {L('छात्र पूर्वावलोकन खोलें', 'Open student preview')}
              </Button>
              <Button variant="outline" onClick={() => router.push(`/${locale}/admin/courses`)} className="text-sm">
                {L('कोर्स सूची पर जाएँ', 'Go to course list')}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => (stepIndex === 0 ? router.push(`/${locale}/admin/courses`) : goBack())} className="text-sm">
          {stepIndex === 0 ? L('रद्द करें', 'Cancel') : L('पीछे', 'Back')}
        </Button>
        {step !== 'review' ? (
          <Button onClick={() => void goNext()} loading={basicsBusy || designBusy} disabled={!canAdvance()} className="text-sm">
            {L('आगे', 'Next')}
          </Button>
        ) : null}
      </div>

      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </div>
  );
}
