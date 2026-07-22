'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Field } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { QUESTION_CSV_TEMPLATE, parseQuestionCsv, type ParsedQuestionRow } from '@/lib/csv';
import type { UploadIntentResponse } from '@rajyarank/contracts';

interface CourseRef { id: string; code: string; titleHi: string; titleEn: string; stateId: string; examId: string }
interface Topic { id: string; nameHi: string; nameEn: string }
interface Chapter { id: string; nameHi: string; nameEn: string; topics: Topic[] }
interface Subject { id: string; nameHi: string; nameEn: string; chapters: Chapter[] }
interface Outline { id: string; titleHi: string; titleEn: string; subjects: Subject[] }
interface QuestionItem {
  id: string;
  currentVersion: { id: string; type: string; textHi: string | null; textEn: string | null; status: string; difficulty: string; marks: number } | null;
}

const TYPES = ['VIDEO', 'PDF', 'TEXT', 'QUIZ', 'MIXED'] as const;
type LessonType = (typeof TYPES)[number];
// Display-only — the underlying LessonType enum value stays QUIZ.
const TYPE_LABELS: Record<LessonType, string> = { VIDEO: 'Video', PDF: 'PDF', TEXT: 'Text', QUIZ: 'Mock Test', MIXED: 'Mixed' };

type AssetKind = 'VIDEO' | 'DOCUMENT';
type AssetMode = 'upload' | 'embed' | 'existing';
interface AssetRow {
  kind: AssetKind;
  mode: AssetMode;
  file: File | null;
  embedUrl: string;
  role: 'PRIMARY_VIDEO' | 'PDF_NOTES' | 'ATTACHMENT';
  /** Filled in once this row's asset has been created+attached server-side, so a retry never repeats it. */
  attachedAssetId: string | null;
  /** Set when `mode === 'existing'` — an already-uploaded, READY asset the
   *  user picked from their own library instead of uploading a fresh file. */
  existingAssetId: string | null;
}

function newAssetRow(kind: AssetKind, role: AssetRow['role']): AssetRow {
  return { kind, mode: 'upload', file: null, embedUrl: '', role, attachedAssetId: null, existingAssetId: null };
}

/** True once a row is actually usable — has a fresh file queued, an embed
 *  URL typed, an existing asset picked, or was already attached in a prior
 *  attempt. Used both to gate "Next" (at least one asset is mandatory) and
 *  to decide what to do with the row on submit. */
function hasAsset(row: AssetRow): boolean {
  return !!row.attachedAssetId
    || (row.mode === 'upload' && !!row.file)
    || (row.mode === 'embed' && !!row.embedUrl.trim())
    || (row.mode === 'existing' && !!row.existingAssetId);
}

interface MyAsset {
  id: string;
  assetType: 'VIDEO' | 'AUDIO' | 'IMAGE' | 'DOCUMENT';
  mimeType: string;
  sizeBytes: number | null;
  storageKey: string | null;
  embedUrl: string | null;
  createdAt: string;
}

function assetLabel(a: MyAsset): string {
  if (a.embedUrl) return a.embedUrl;
  const name = a.storageKey?.split('/').pop();
  return name ?? a.id;
}

function AssetRowEditor({
  row, onChange, onRemove, allowKindSwitch, showRoleSelect, freePreview, L,
}: {
  row: AssetRow;
  onChange: (r: AssetRow) => void;
  onRemove?: () => void;
  allowKindSwitch: boolean;
  showRoleSelect: boolean;
  freePreview: boolean;
  L: (h: string, e: string) => string;
}) {
  const [myAssets, setMyAssets] = useState<MyAsset[] | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);

  function switchToExisting() {
    onChange({ ...row, mode: 'existing' });
    if (myAssets !== null || loadingAssets) return; // already fetched (or fetching) for this row's kind
    setLoadingAssets(true);
    apiFetch<MyAsset[]>(`/staff/assets?assetType=${row.kind}`)
      .then(setMyAssets)
      .catch(() => setMyAssets([]))
      .finally(() => setLoadingAssets(false));
  }

  return (
    <div className="grid gap-2 rounded-md border border-line p-3">
      <div className="flex flex-wrap items-center gap-2">
        {allowKindSwitch ? (
          <select
            value={row.kind}
            onChange={(e) => {
              const kind = e.target.value as AssetKind;
              onChange({ ...row, kind, role: kind === 'DOCUMENT' ? 'PDF_NOTES' : 'PRIMARY_VIDEO', mode: 'upload', file: null, embedUrl: '', existingAssetId: null });
              setMyAssets(null);
            }}
            className="rounded-md border border-line px-2 py-1.5 text-sm"
          >
            <option value="VIDEO">{L('वीडियो', 'Video')}</option>
            <option value="DOCUMENT">{L('पीडीएफ़', 'PDF')}</option>
          </select>
        ) : (
          <span className="rounded-md bg-line px-2 py-1.5 text-xs font-bold text-ink">{row.kind === 'VIDEO' ? L('वीडियो', 'Video') : L('पीडीएफ़', 'PDF')}</span>
        )}
        <div className="flex overflow-hidden rounded-md border border-line text-xs font-bold">
          <button type="button" onClick={() => onChange({ ...row, mode: 'upload' })} className={`px-2.5 py-1.5 ${row.mode === 'upload' ? 'bg-navy-950 text-white' : 'bg-white text-muted'}`}>{L('अपलोड', 'Upload')}</button>
          <button type="button" onClick={switchToExisting} className={`px-2.5 py-1.5 ${row.mode === 'existing' ? 'bg-navy-950 text-white' : 'bg-white text-muted'}`}>{L('मौजूदा इस्तेमाल करें', 'Use existing')}</button>
          <button type="button" disabled={!freePreview || row.kind !== 'VIDEO'} onClick={() => onChange({ ...row, mode: 'embed' })} className={`px-2.5 py-1.5 disabled:opacity-40 ${row.mode === 'embed' ? 'bg-navy-950 text-white' : 'bg-white text-muted'}`}>{L('एम्बेड यूआरएल', 'Embed URL')}</button>
        </div>
        {onRemove ? <button type="button" onClick={onRemove} className="ml-auto text-xs font-bold text-danger">{L('हटाएँ', 'Remove')}</button> : null}
      </div>
      {row.mode === 'upload' ? (
        <div>
          <input key="upload" type="file" accept={row.kind === 'VIDEO' ? 'video/mp4,video/webm' : 'application/pdf'} onChange={(e) => onChange({ ...row, file: e.target.files?.[0] ?? null })} className="text-sm" />
          {/* The input's own "no file chosen" display never reflects a file
           *  attached programmatically (e.g. via the batch multi-file picker
           *  above) — without this, a row that already has a queued file
           *  looks empty/broken even though it isn't. */}
          {row.file ? <p className="mt-1 text-xs font-bold text-success">✓ {row.file.name}</p> : null}
        </div>
      ) : row.mode === 'existing' ? (
        <div>
          {loadingAssets ? (
            <p className="text-xs text-muted">{L('लोड हो रहा है…', 'Loading…')}</p>
          ) : !myAssets || myAssets.length === 0 ? (
            <p className="text-xs text-muted">{L('आपने अभी तक इस प्रकार की कोई तैयार संसाधन अपलोड नहीं की है।', "You haven't uploaded a ready asset of this type yet.")}</p>
          ) : (
            <select
              value={row.existingAssetId ?? ''}
              onChange={(e) => onChange({ ...row, existingAssetId: e.target.value || null })}
              className="w-full rounded-md border border-line px-3 py-2 text-sm"
            >
              <option value="">{L('चुनें…', 'Select…')}</option>
              {myAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {assetLabel(a)}{a.sizeBytes ? ` (${(a.sizeBytes / 1_000_000).toFixed(1)} MB)` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      ) : (
        <input key="embed" value={row.embedUrl} onChange={(e) => onChange({ ...row, embedUrl: e.target.value })} placeholder="https://…" className="w-full rounded-md border border-line px-3 py-2 text-sm" />
      )}
      {!freePreview && row.kind === 'VIDEO' ? <p className="text-xs text-muted">{L('एम्बेड यूआरएल केवल नि:शुल्क प्रीव्यू पाठों के लिए उपलब्ध है।', 'Embed URL is only available for free-preview lessons.')}</p> : null}
      {showRoleSelect ? (
        <select value={row.role} onChange={(e) => onChange({ ...row, role: e.target.value as AssetRow['role'] })} className="w-full rounded-md border border-line px-2 py-1.5 text-sm">
          <option value="PRIMARY_VIDEO">{L('मुख्य वीडियो', 'Primary video')}</option>
          <option value="PDF_NOTES">{L('पीडीएफ़ नोट्स', 'PDF notes')}</option>
          <option value="ATTACHMENT">{L('अतिरिक्त संसाधन', 'Attachment')}</option>
        </select>
      ) : null}
    </div>
  );
}

type ResultStep = { label: string; ok: boolean };

const LESSON_STEPS = ['type', 'mapping', 'details', 'review'] as const;
const QUIZ_STEPS = ['type', 'quizSetup', 'questions', 'review'] as const;

/** Pre-seeded course/topic context — when launched from a specific topic
 *  (CurriculumBuilder.tsx), the wizard already knows where content is going
 *  and skips its own course/subject/chapter/topic pickers entirely. */
export interface ContentWizardContext {
  courseId: string;
  courseTitleHi: string;
  courseTitleEn: string;
  subjectId: string;
  chapterId: string;
  topicId: string;
  topicNameHi: string;
  topicNameEn: string;
}

export function CreateContentWizard({
  locale,
  context,
  triggerLabel,
  triggerClassName,
  triggerVariant,
  onCreated,
  allowedTypes,
}: {
  locale: 'hi' | 'en';
  context?: ContentWizardContext;
  triggerLabel?: string;
  triggerClassName?: string;
  triggerVariant?: 'primary' | 'secondary' | 'outline';
  /** Called (alongside router.refresh()) after a successful create — lets a
   *  purely client-state host (the Course Studio) re-sync without depending
   *  on a server-component parent page re-fetching props. */
  onCreated?: () => void;
  /** Restricts the Content type dropdown to this subset — e.g. the Mock
   *  Tests page only wants QUIZ offered, while general content-authoring
   *  pages want everything EXCEPT QUIZ (Mock Tests have their own dual
   *  Head+Reviewer approval workflow, reached only from that page). Defaults
   *  to every type when omitted. */
  allowedTypes?: readonly LessonType[];
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ResultStep[]>([]);

  const defaultType = (allowedTypes ?? TYPES)[0] ?? 'VIDEO';
  const [lessonType, setLessonType] = useState<LessonType>(defaultType);
  const [freePreview, setFreePreview] = useState(false);
  const [courses, setCourses] = useState<CourseRef[]>([]);
  const [courseId, setCourseId] = useState('');
  const [outline, setOutline] = useState<Outline | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [titleHi, setTitleHi] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [language, setLanguage] = useState<'HINDI' | 'ENGLISH' | 'BILINGUAL'>('BILINGUAL');

  // VIDEO / PDF (single asset) + MIXED (multi-asset list)
  const [singleAsset, setSingleAsset] = useState<AssetRow>(() => newAssetRow('VIDEO', 'PRIMARY_VIDEO'));
  const [mixedAssets, setMixedAssets] = useState<AssetRow[]>([]);

  // Quiz-only state
  const [durationMinutes, setDurationMinutes] = useState('20');
  const [attemptLimit, setAttemptLimit] = useState('');
  const [resultRelease, setResultRelease] = useState<'IMMEDIATE' | 'AFTER_WINDOW' | 'MANUAL'>('IMMEDIATE');
  const [passingScore, setPassingScore] = useState('');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [bulkRows, setBulkRows] = useState<ParsedQuestionRow[]>([]);
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Created-so-far state, so Retry never recreates work that already succeeded.
  const [createdLesson, setCreatedLesson] = useState<{ id: string; currentVersionId: string } | null>(null);
  const [submittedForReview, setSubmittedForReview] = useState(false);

  const steps = lessonType === 'QUIZ' ? QUIZ_STEPS : LESSON_STEPS;
  const step = steps[stepIndex];

  useEffect(() => {
    if (!open || context) return; // pre-seeded — no picker to populate
    apiFetch<CourseRef[]>('/courses').then(setCourses).catch(() => setCourses([]));
  }, [open, context]);

  useEffect(() => {
    if (context) return; // pre-seeded — never clear the context-provided ids
    setOutline(null); setSubjectId(''); setChapterId(''); setTopicId('');
    if (!courseId) return;
    apiFetch<Outline>(`/courses/${courseId}/outline`).then(setOutline).catch(() => setOutline(null));
  }, [courseId, context]);

  // Pre-fill from context every time the wizard (re)opens.
  useEffect(() => {
    if (!open || !context) return;
    setCourseId(context.courseId);
    setSubjectId(context.subjectId);
    setChapterId(context.chapterId);
    setTopicId(context.topicId);
  }, [open, context]);

  // Keep the single-asset row's kind/role in sync with the chosen content type
  // (VIDEO ↔ PDF) — without this, switching type after touching the asset
  // panel would silently upload the wrong asset kind under the wrong role.
  useEffect(() => {
    if (lessonType === 'VIDEO' && singleAsset.kind !== 'VIDEO') setSingleAsset(newAssetRow('VIDEO', 'PRIMARY_VIDEO'));
    if (lessonType === 'PDF' && singleAsset.kind !== 'DOCUMENT') setSingleAsset(newAssetRow('DOCUMENT', 'PDF_NOTES'));
  }, [lessonType]);

  useEffect(() => {
    if (!open || lessonType !== 'QUIZ' || !subjectId) { setQuestions([]); return; }
    apiFetch<QuestionItem[]>(`/staff/questions?subjectId=${subjectId}`).then(setQuestions).catch(() => setQuestions([]));
  }, [open, lessonType, subjectId]);

  const subjects = outline?.subjects ?? [];
  const chapters = subjects.find((s) => s.id === subjectId)?.chapters ?? [];
  const topics = chapters.find((c) => c.id === chapterId)?.topics ?? [];
  const nm = (o: { nameHi: string; nameEn: string }) => (hi ? o.nameHi : o.nameEn);
  const selectedCourse = courses.find((c) => c.id === courseId) ?? null;
  const availableTypes = (allowedTypes ?? TYPES).filter((t) => (context ? t !== 'QUIZ' : true));
  const approvedQuestions = questions.filter((q) => q.currentVersion && (q.currentVersion.status === 'APPROVED' || q.currentVersion.status === 'PUBLISHED'));

  function reset() {
    setStepIndex(0); setError(null); setResults([]);
    setLessonType(defaultType); setFreePreview(false);
    setCourseId(''); setOutline(null); setSubjectId(''); setChapterId(''); setTopicId('');
    setTitleHi(''); setTitleEn(''); setEstimatedMinutes(''); setDifficulty('MEDIUM'); setLanguage('BILINGUAL');
    setSingleAsset(newAssetRow('VIDEO', 'PRIMARY_VIDEO')); setMixedAssets([]);
    setDurationMinutes('20'); setAttemptLimit(''); setResultRelease('IMMEDIATE'); setPassingScore('');
    setQuestions([]); setSelectedQuestionIds([]);
    setBulkRows([]); setBulkFileName(null); setBulkError(null);
    setCreatedLesson(null); setSubmittedForReview(false);
  }
  function close() { setOpen(false); reset(); }

  function canAdvance(): boolean {
    if (step === 'mapping') {
      if (!(context?.topicId ?? topicId)) return false;
      // Media is mandatory for types that carry it — TEXT has no asset step.
      if (lessonType === 'VIDEO' || lessonType === 'PDF') return hasAsset(singleAsset);
      if (lessonType === 'MIXED') return mixedAssets.some(hasAsset);
      return true;
    }
    if (step === 'details') return titleHi.trim().length >= 2 && titleEn.trim().length >= 2;
    if (step === 'quizSetup') return !!selectedCourse && titleHi.trim().length >= 2 && titleEn.trim().length >= 2 && Number(durationMinutes) > 0;
    if (step === 'questions') return selectedQuestionIds.length + bulkRows.length >= 1;
    return true;
  }

  // ── Upload / embed / existing-asset sequencing ───────────────────────────
  async function resolveAssetId(row: AssetRow): Promise<string> {
    if (row.mode === 'existing') {
      if (!row.existingAssetId) throw new Error('No asset selected.');
      return row.existingAssetId;
    }
    if (row.mode === 'embed') {
      const created = await apiFetch<{ id: string; status: string }>('/staff/assets/embed', {
        method: 'POST',
        body: JSON.stringify({ assetType: 'VIDEO', embedUrl: row.embedUrl.trim() }),
      });
      return created.id;
    }
    if (!row.file) throw new Error('No file selected.');
    const intent = await apiFetch<UploadIntentResponse>('/staff/assets/upload-intents', {
      method: 'POST',
      body: JSON.stringify({ assetType: row.kind, fileName: row.file.name, mimeType: row.file.type, sizeBytes: row.file.size }),
    });
    const put = await fetch(intent.uploadUrl, { method: 'PUT', headers: { 'content-type': row.file.type }, body: row.file });
    if (!put.ok) throw new Error('File upload to storage failed.');
    const completed = await apiFetch<{ id: string; status: string }>(`/staff/assets/${intent.assetId}/complete`, { method: 'POST', body: JSON.stringify({}) });
    return completed.id;
  }

  async function attachRow(versionId: string, row: AssetRow, sequence: number): Promise<string> {
    const assetId = await resolveAssetId(row);
    await apiFetch(`/staff/content/versions/${versionId}/assets`, {
      method: 'POST',
      body: JSON.stringify({ assetId, role: row.role, sequence }),
    });
    return assetId;
  }

  // ── Submit (lesson types): create lesson → attach asset(s) → submit ──
  async function submitLesson(submitForReview: boolean) {
    setBusy(true); setError(null);
    const log: ResultStep[] = [...results];
    try {
      let lesson = createdLesson;
      if (!lesson) {
        const created = await apiFetch<{ id: string; currentVersionId: string }>(`/admin/courses/topics/${topicId}/lessons`, {
          method: 'POST',
          body: JSON.stringify({
            lessonType, freePreview, sequence: 0, titleHi: titleHi.trim(), titleEn: titleEn.trim(),
            ...(estimatedMinutes ? { estimatedMinutes: Number(estimatedMinutes) } : {}),
            difficulty, language,
          }),
        });
        lesson = { id: created.id, currentVersionId: created.currentVersionId };
        setCreatedLesson(lesson);
        log.push({ label: L('पाठ बनाया गया', 'Lesson created'), ok: true });
        // Notify the host as soon as the lesson itself exists — a later step
        // (asset attach / submit-for-review) can still fail and leave this
        // attempt partially complete, but the host's curriculum view should
        // already reflect the real, persisted lesson rather than go stale.
        router.refresh();
        onCreated?.();
      }

      if (lessonType !== 'TEXT') {
        const rows: AssetRow[] = lessonType === 'MIXED' ? mixedAssets : [singleAsset];
        for (const [i, row] of rows.entries()) {
          if (row.attachedAssetId) continue; // already attached in a prior attempt
          if (!hasAsset(row)) continue; // optional row (MIXED only) left empty
          const assetId = await attachRow(lesson.currentVersionId, row, i);
          row.attachedAssetId = assetId;
          if (lessonType === 'MIXED') setMixedAssets([...mixedAssets]); else setSingleAsset({ ...row });
          log.push({ label: L(`संसाधन जोड़ा गया (${i + 1})`, `Asset attached (${i + 1})`), ok: true });
        }
      }

      if (submitForReview && !submittedForReview) {
        await apiFetch(`/staff/content/versions/${lesson.currentVersionId}/submit`, { method: 'POST' });
        setSubmittedForReview(true);
        log.push({ label: L('समीक्षा हेतु सबमिट किया गया', 'Submitted for review'), ok: true });
      } else if (!submitForReview) {
        log.push({ label: L('ड्राफ़्ट के रूप में सहेजा गया', 'Saved as draft'), ok: true });
      }

      setResults(log);
      router.refresh();
      onCreated?.();
      close();
    } catch (e) {
      log.push({ label: L('यह चरण विफल रहा', 'This step failed'), ok: false });
      setResults(log);
      const err = e as ApiError;
      setError(
        err?.code === 'PERMISSION_DENIED'
          ? L('पहुँच अस्वीकृत — आपके पास कंटेंट बनाने की अनुमति नहीं है।', 'Access denied — you cannot create content.')
          : err?.code === 'CONFLICT'
            ? (err.message ?? L('एम्बेड यूआरएल केवल नि:शुल्क प्रीव्यू के लिए है।', 'Embed URLs are only allowed for free-preview lessons.'))
            : err?.code === 'VALIDATION_FAILED'
              ? L('कृपया सभी आवश्यक फ़ील्ड सही भरें।', 'Please complete all required fields correctly.')
              : err?.message ?? L('कंटेंट बनाना विफल रहा।', 'Failed to create content.'),
      );
    } finally {
      setBusy(false);
    }
  }

  function downloadBulkTemplate() {
    const url = URL.createObjectURL(new Blob([QUESTION_CSV_TEMPLATE], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rajyarank-questions-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Bulk-uploaded rows are scoped to whichever subject this quiz is already
  // being built for — the CSV's own subjectId column (if present) is
  // ignored, so staff don't need to hand-copy subject UUIDs into the sheet.
  async function onBulkFile(file: File) {
    setBulkError(null);
    try {
      const text = await file.text();
      const rows = parseQuestionCsv(text).map((r) => ({ ...r, subjectId }));
      setBulkRows(rows);
      setBulkFileName(file.name);
    } catch (e) {
      setBulkError((e as Error).message ?? L('CSV पढ़ने में विफल।', 'Failed to read CSV.'));
      setBulkRows([]);
      setBulkFileName(null);
    }
  }

  // ── Submit (quiz): one atomic call ───────────────────────────────────────
  async function submitQuiz(submitForReview: boolean) {
    setBusy(true); setError(null);
    try {
      if (!selectedCourse) throw new Error('Course required.');
      await apiFetch('/staff/tests/quick-create', {
        method: 'POST',
        body: JSON.stringify({
          examId: selectedCourse.examId,
          courseId: selectedCourse.id,
          titleHi: titleHi.trim(),
          titleEn: titleEn.trim(),
          durationMinutes: Number(durationMinutes),
          negativeMarking: true,
          ...(attemptLimit ? { attemptLimit: Number(attemptLimit) } : {}),
          resultRelease,
          ...(passingScore ? { passingScore: Number(passingScore) } : {}),
          questionVersionIds: selectedQuestionIds,
          newQuestions: bulkRows,
          submitForReview,
        }),
      });
      setResults([{
        label: submitForReview
          ? L('मॉक टेस्ट बनाया और सबमिट किया गया', 'Mock test created and submitted')
          : L('मॉक टेस्ट ड्राफ़्ट के रूप में सहेजा गया', 'Mock test saved as draft'),
        ok: true,
      }]);
      router.refresh();
      onCreated?.();
      close();
    } catch (e) {
      const err = e as ApiError;
      setResults([{ label: L('मॉक टेस्ट बनाना विफल रहा', 'Mock test creation failed'), ok: false }]);
      setError(
        err?.code === 'PERMISSION_DENIED'
          ? L('पहुँच अस्वीकृत।', 'Access denied.')
          : err?.code === 'CONTENT_STATE_INVALID'
            ? L('चयनित प्रश्नों में से कुछ स्वीकृत नहीं हैं।', 'Some selected questions are not approved.')
            : err?.code === 'VALIDATION_FAILED' && err.fieldErrors?.length
              ? `${err.message} ${err.fieldErrors.map((fe) => fe.message).slice(0, 5).join('; ')}`
              : err?.message ?? L('मॉक टेस्ट बनाना विफल रहा।', 'Failed to create mock test.'),
      );
    } finally {
      setBusy(false);
    }
  }

  function submit(submitForReview: boolean) {
    return lessonType === 'QUIZ' ? submitQuiz(submitForReview) : submitLesson(submitForReview);
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant={triggerVariant ?? 'primary'} className={triggerClassName ?? 'text-sm'}>
        {triggerLabel ?? L('+ नया कंटेंट बनाएँ', '+ Create content')}
      </Button>
    );
  }

  const STEP_LABELS: Record<(typeof LESSON_STEPS)[number] | (typeof QUIZ_STEPS)[number], string> = {
    type: L('1. कंटेंट प्रकार', '1. Content type'),
    mapping: context ? L('2. माध्यम जोड़ें', '2. Add media') : L('2. कोर्स व माध्यम', '2. Course & media'),
    quizSetup: L('2. मॉक टेस्ट सेटअप', '2. Mock test setup'),
    details: L('3. विवरण', '3. Details'),
    questions: L('3. प्रश्न चुनें', '3. Select questions'),
    review: L('4. समीक्षा व बनाएँ', '4. Review & create'),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black text-navy-900">{L('नया कंटेंट', 'New content')}</h2>
          <button type="button" onClick={close} aria-label={L('बंद करें', 'Close')} className="text-muted hover:text-ink">✕</button>
        </div>
        <ol className="mb-4 flex flex-wrap gap-2 text-xs font-bold">
          {steps.map((s, i) => (
            <li key={s} className={`rounded-full px-2 py-1 ${i === stepIndex ? 'bg-navy-950 text-white' : i < stepIndex ? 'bg-teal-100 text-success' : 'bg-line text-muted'}`}>{STEP_LABELS[s]}</li>
          ))}
        </ol>

        {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}

        {step === 'type' ? (
          <div className="grid gap-3">
            <label className="block text-sm font-extrabold text-ink" htmlFor="ltype">{L('कंटेंट प्रकार', 'Content type')}</label>
            <select id="ltype" value={lessonType} onChange={(e) => { setLessonType(e.target.value as LessonType); setStepIndex(0); }} className="w-full rounded-md border border-line px-3 py-2">
              {availableTypes.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={freePreview} onChange={(e) => setFreePreview(e.target.checked)} disabled={lessonType === 'QUIZ'} />
              {L('नि:शुल्क प्रीव्यू (लॉगिन के बिना उपलब्ध)', 'Free preview (available without login)')}
            </label>
          </div>
        ) : null}

        {step === 'mapping' ? (
          <div className="grid gap-3">
            {context ? (
              <p className="rounded-md border border-line bg-surface-soft px-3 py-2 text-sm font-bold text-ink">
                {L(`जोड़ा जा रहा है: ${context.courseTitleHi} → ${context.topicNameHi}`, `Adding to: ${context.courseTitleEn} → ${context.topicNameEn}`)}
              </p>
            ) : (
              <>
                <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full rounded-md border border-line px-3 py-2 text-sm">
                  <option value="">{L('कोर्स चुनें…', 'Select course…')}</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{hi ? c.titleHi : c.titleEn} ({c.code})</option>)}
                </select>
                <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setChapterId(''); setTopicId(''); }} disabled={!subjects.length} className="w-full rounded-md border border-line px-3 py-2 text-sm">
                  <option value="">{L('विषय चुनें…', 'Select subject…')}</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{nm(s)}</option>)}
                </select>
                <select value={chapterId} onChange={(e) => { setChapterId(e.target.value); setTopicId(''); }} disabled={!chapters.length} className="w-full rounded-md border border-line px-3 py-2 text-sm">
                  <option value="">{L('अध्याय चुनें…', 'Select chapter…')}</option>
                  {chapters.map((c) => <option key={c.id} value={c.id}>{nm(c)}</option>)}
                </select>
                <select value={topicId} onChange={(e) => setTopicId(e.target.value)} disabled={!topics.length} className="w-full rounded-md border border-line px-3 py-2 text-sm">
                  <option value="">{L('टॉपिक चुनें…', 'Select topic…')}</option>
                  {topics.map((t) => <option key={t.id} value={t.id}>{nm(t)}</option>)}
                </select>
                {!courses.length ? <p className="text-xs text-muted">{L('कोई प्रकाशित कोर्स नहीं मिला।', 'No published courses found.')}</p> : null}
              </>
            )}

            {lessonType === 'VIDEO' || lessonType === 'PDF' ? (
              <div className="mt-2">
                <p className="mb-2 text-sm font-extrabold text-ink">{L('मीडिया जोड़ें (आवश्यक)', 'Add media (required)')}</p>
                <AssetRowEditor
                  row={singleAsset}
                  onChange={setSingleAsset}
                  allowKindSwitch={false}
                  showRoleSelect={false}
                  freePreview={freePreview}
                  L={L}
                />
                {!hasAsset(singleAsset) ? (
                  <p className="mt-2 text-xs font-bold text-danger">{L('जारी रखने के लिए एक फ़ाइल, एम्बेड यूआरएल या मौजूदा संसाधन चुनें।', 'Add a file, embed URL, or an existing asset to continue.')}</p>
                ) : null}
              </div>
            ) : null}

            {lessonType === 'MIXED' ? (
              <div className="mt-2 grid gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-extrabold text-ink">{L('मीडिया आइटम', 'Media items')}</p>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer text-xs font-bold text-navy-900 hover:underline">
                      {L('+ कई फ़ाइलें जोड़ें', '+ Add multiple files')}
                      <input
                        type="file"
                        multiple
                        accept="video/mp4,video/webm,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (!files || !files.length) return;
                          const hasVideo = mixedAssets.some((a) => a.kind === 'VIDEO');
                          const hasPdf = mixedAssets.some((a) => a.kind === 'DOCUMENT');
                          let seenVideo = hasVideo;
                          let seenPdf = hasPdf;
                          const newRows: AssetRow[] = Array.from(files).map((file) => {
                            const isVideo = file.type.startsWith('video/');
                            const kind: AssetKind = isVideo ? 'VIDEO' : 'DOCUMENT';
                            const role: AssetRow['role'] = isVideo
                              ? (seenVideo ? 'ATTACHMENT' : 'PRIMARY_VIDEO')
                              : (seenPdf ? 'ATTACHMENT' : 'PDF_NOTES');
                            if (isVideo) seenVideo = true; else seenPdf = true;
                            return { kind, mode: 'upload', file, embedUrl: '', role, attachedAssetId: null, existingAssetId: null };
                          });
                          setMixedAssets([...mixedAssets, ...newRows]);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <button type="button" onClick={() => setMixedAssets([...mixedAssets, newAssetRow('VIDEO', 'ATTACHMENT')])} className="text-xs font-bold text-navy-900">{L('+ आइटम जोड़ें', '+ Add item')}</button>
                  </div>
                </div>
                <p className="-mt-1 text-xs text-muted">
                  {L(
                    'एक साथ कई वीडियो/पीडीएफ़ फ़ाइलें चुनें — प्रत्येक अपने आप एक आइटम बन जाएगी, प्रकार व भूमिका बाद में बदली जा सकती है।',
                    'Pick several video/PDF files at once — each becomes its own item automatically; type and role can be adjusted below afterwards.',
                  )}
                </p>
                {mixedAssets.map((row, i) => (
                  <AssetRowEditor
                    key={i}
                    row={row}
                    onChange={(r) => setMixedAssets(mixedAssets.map((x, j) => (j === i ? r : x)))}
                    onRemove={() => setMixedAssets(mixedAssets.filter((_, j) => j !== i))}
                    allowKindSwitch
                    showRoleSelect
                    freePreview={freePreview}
                    L={L}
                  />
                ))}
                {!mixedAssets.length ? (
                  <p className="text-xs font-bold text-danger">{L('जारी रखने के लिए कम से कम एक वीडियो/पीडीएफ़ आइटम जोड़ें।', 'Add at least one video/PDF item to continue.')}</p>
                ) : !mixedAssets.some(hasAsset) ? (
                  <p className="text-xs font-bold text-danger">{L('कम से कम एक आइटम में फ़ाइल, एम्बेड यूआरएल या मौजूदा संसाधन चुनें।', 'At least one item needs a file, embed URL, or an existing asset selected.')}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 'quizSetup' ? (
          <div className="grid gap-3">
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full rounded-md border border-line px-3 py-2 text-sm">
              <option value="">{L('कोर्स चुनें (परीक्षा स्वतः तय होगी)…', 'Select course (exam derived automatically)…')}</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{hi ? c.titleHi : c.titleEn} ({c.code})</option>)}
            </select>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!subjects.length} className="w-full rounded-md border border-line px-3 py-2 text-sm">
              <option value="">{L('विषय चुनें (प्रश्न फ़िल्टर हेतु)…', 'Select subject (to filter questions)…')}</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{nm(s)}</option>)}
            </select>
            <Field label={L('शीर्षक (हिन्दी)', 'Title (Hindi)')} name="qTitleHi" value={titleHi} onChange={(e) => setTitleHi(e.target.value)} />
            <Field label={L('शीर्षक (English)', 'Title (English)')} name="qTitleEn" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label={L('अवधि (मिनट)', 'Duration (minutes)')} name="duration" inputMode="numeric" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value.replace(/\D/g, ''))} />
              <Field label={L('प्रयास सीमा (वैकल्पिक)', 'Attempt limit (optional)')} name="attempts" inputMode="numeric" value={attemptLimit} onChange={(e) => setAttemptLimit(e.target.value.replace(/\D/g, ''))} />
            </div>
            <label className="block text-sm font-extrabold text-ink" htmlFor="resultRelease">{L('परिणाम कब जारी हो', 'Result release')}</label>
            <select id="resultRelease" value={resultRelease} onChange={(e) => setResultRelease(e.target.value as typeof resultRelease)} className="w-full rounded-md border border-line px-3 py-2 text-sm">
              <option value="IMMEDIATE">{L('तुरंत', 'Immediately')}</option>
              <option value="AFTER_WINDOW">{L('विंडो के बाद', 'After window')}</option>
              <option value="MANUAL">{L('मैन्युअल', 'Manual')}</option>
            </select>
            <Field label={L('उत्तीर्ण स्कोर % (वैकल्पिक)', 'Passing score % (optional)')} name="passing" inputMode="numeric" value={passingScore} onChange={(e) => setPassingScore(e.target.value.replace(/\D/g, ''))} />
          </div>
        ) : null}

        {step === 'details' ? (
          <div>
            <Field label={L('शीर्षक (हिन्दी)', 'Title (Hindi)')} name="titleHi" value={titleHi} onChange={(e) => setTitleHi(e.target.value)} />
            <Field label={L('शीर्षक (English)', 'Title (English)')} name="titleEn" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
            <Field label={L('अनुमानित मिनट (वैकल्पिक)', 'Estimated minutes (optional)')} name="mins" inputMode="numeric" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value.replace(/\D/g, ''))} />
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-extrabold text-ink" htmlFor="difficulty">{L('कठिनाई', 'Difficulty')}</label>
                <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)} className="w-full rounded-md border border-line px-3 py-2 text-sm">
                  <option value="EASY">{L('आसान', 'Easy')}</option>
                  <option value="MEDIUM">{L('मध्यम', 'Medium')}</option>
                  <option value="HARD">{L('कठिन', 'Hard')}</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-extrabold text-ink" htmlFor="language">{L('भाषा', 'Language')}</label>
                <select id="language" value={language} onChange={(e) => setLanguage(e.target.value as typeof language)} className="w-full rounded-md border border-line px-3 py-2 text-sm">
                  <option value="HINDI">{L('हिन्दी', 'Hindi')}</option>
                  <option value="ENGLISH">{L('English', 'English')}</option>
                  <option value="BILINGUAL">{L('द्विभाषी', 'Bilingual')}</option>
                </select>
              </div>
            </div>
          </div>
        ) : null}

        {step === 'questions' ? (
          <div className="grid gap-2">
            {!subjectId ? (
              <p className="text-sm text-muted">{L('पहले पिछले चरण में विषय चुनें।', 'Select a subject on the previous step first.')}</p>
            ) : approvedQuestions.length === 0 ? (
              <p className="text-sm text-muted">{L('इस विषय के लिए कोई स्वीकृत प्रश्न नहीं मिला।', 'No approved questions found for this subject.')}</p>
            ) : (
              <ul className="grid gap-2">
                {approvedQuestions.map((q) => {
                  const vid = q.currentVersion!.id;
                  const checked = selectedQuestionIds.includes(vid);
                  return (
                    <li key={q.id} className="flex items-start gap-2 rounded-md border border-line p-2 text-sm">
                      <input type="checkbox" checked={checked} onChange={(e) => setSelectedQuestionIds(e.target.checked ? [...selectedQuestionIds, vid] : selectedQuestionIds.filter((x) => x !== vid))} className="mt-1" />
                      <div>
                        <div className="font-bold text-ink">{(hi ? q.currentVersion!.textHi : q.currentVersion!.textEn) ?? q.currentVersion!.textEn ?? q.currentVersion!.textHi}</div>
                        <div className="text-xs text-muted">{q.currentVersion!.type} · {q.currentVersion!.difficulty} · {q.currentVersion!.marks} {L('अंक', 'mark(s)')}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-xs text-muted">{L(`चयनित: ${selectedQuestionIds.length}`, `Selected: ${selectedQuestionIds.length}`)}</p>

            <div className="mt-2 rounded-md border border-dashed border-line bg-surface-soft p-3">
              <div className="mb-1 text-sm font-extrabold text-ink">{L('या नए प्रश्न बल्क अपलोड करें (CSV)', 'Or bulk-upload new questions (CSV)')}</div>
              <p className="mb-2 text-xs text-muted">
                {L(
                  'अपलोड किए गए प्रश्न इस मॉक टेस्ट में सीधे जुड़ते हैं और स्वतः स्वीकृत माने जाते हैं — गुणवत्ता जांच इस टेस्ट की अपनी समीक्षा (एकेडमिक हेड या रिव्यूअर) से होती है।',
                  'Uploaded questions attach directly to this mock test and are treated as pre-approved — quality control happens via this test’s own review (an Academic Head or Reviewer), not a separate per-question approval.',
                )}
              </p>
              <p className="mb-2 text-xs text-muted">
                {L(
                  'टेम्पलेट में एक वैकल्पिक topicId कॉलम है — भरने पर वह प्रश्न कमज़ोर-विषय विश्लेषण में सही टॉपिक से जुड़ेगा; खाली छोड़ने पर विषय-स्तर पर गिना जाएगा। subjectId और topicId दोनों में UUID या उसका सटीक नाम (जैसे "Polity") काम करता है।',
                  'The template has an optional topicId column — fill it in so the question is attributed to the right topic in weak-topic analysis; leave it blank and it\'s counted at the subject level instead. Both subjectId and topicId accept either a UUID or the exact name (e.g. "Polity").',
                )}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={downloadBulkTemplate} className="text-xs">{L('टेम्पलेट डाउनलोड', 'Download template')}</Button>
                <label className="cursor-pointer rounded-md border border-line bg-white px-3 py-1.5 text-xs font-extrabold text-navy-900 hover:bg-surface-soft">
                  {L('CSV अपलोड करें', 'Upload CSV')}
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    disabled={!subjectId}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void onBulkFile(f);
                      e.target.value = '';
                    }}
                  />
                </label>
                {!subjectId ? <span className="text-xs text-muted">{L('पहले विषय चुनें।', 'Select a subject first.')}</span> : null}
              </div>
              {bulkError ? <div className="mt-2"><Alert tone="error">{bulkError}</Alert></div> : null}
              {bulkFileName && bulkRows.length ? (
                <p className="mt-2 text-xs font-bold text-success">{L(`${bulkFileName} से ${bulkRows.length} प्रश्न पार्स हुए।`, `Parsed ${bulkRows.length} question(s) from ${bulkFileName}.`)}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 'review' ? (
          <div className="grid gap-3 text-sm">
            <dl className="grid gap-1">
              <div className="flex justify-between"><dt className="text-muted">{L('प्रकार', 'Type')}</dt><dd className="font-bold text-ink">{lessonType}{freePreview ? ' · ' + L('नि:शुल्क', 'free') : ''}</dd></div>
              {lessonType !== 'QUIZ' ? (
                <div className="flex justify-between">
                  <dt className="text-muted">{L('टॉपिक', 'Topic')}</dt>
                  <dd className="font-bold text-ink">
                    {context ? nm({ nameHi: context.topicNameHi, nameEn: context.topicNameEn }) : topics.find((t) => t.id === topicId) ? nm(topics.find((t) => t.id === topicId)!) : topicId}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between"><dt className="text-muted">{L('शीर्षक', 'Title')}</dt><dd className="font-bold text-ink">{hi ? titleHi : titleEn}</dd></div>
              {lessonType === 'QUIZ' ? (
                <div className="flex justify-between">
                  <dt className="text-muted">{L('प्रश्न', 'Questions')}</dt>
                  <dd className="font-bold text-ink">
                    {selectedQuestionIds.length + bulkRows.length}
                    {bulkRows.length ? L(` (${bulkRows.length} बल्क-अपलोड)`, ` (${bulkRows.length} bulk-uploaded)`) : ''}
                  </dd>
                </div>
              ) : null}
            </dl>
            {results.length ? (
              <ul className="grid gap-1 rounded-md border border-line bg-surface-soft p-2">
                {results.map((r, i) => (
                  <li key={i} className={`text-xs font-bold ${r.ok ? 'text-success' : 'text-danger'}`}>{r.ok ? '✓' : '✗'} {r.label}</li>
                ))}
              </ul>
            ) : null}
            <p className="text-xs text-muted">
              {L(
                'ड्राफ़्ट के रूप में सहेजें ताकि आप बाद में इसे पूरा कर सकें, या समीक्षा हेतु सबमिट करें ताकि यह कार्यप्रवाह बोर्ड में आगे बढ़े।',
                'Save as draft to come back and finish it later, or submit for review to move it forward on the workflow board.',
              )}
            </p>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-between gap-2">
          <Button variant="outline" onClick={() => (stepIndex === 0 ? close() : setStepIndex((s) => s - 1))} className="text-sm">
            {stepIndex === 0 ? L('रद्द करें', 'Cancel') : L('पीछे', 'Back')}
          </Button>
          {stepIndex < steps.length - 1 ? (
            <Button onClick={() => canAdvance() && setStepIndex((s) => s + 1)} disabled={!canAdvance()} className="text-sm">
              {L('आगे', 'Next')}
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void submit(false)} loading={busy} className="text-sm">
                {L('ड्राफ़्ट के रूप में सहेजें', 'Save as Draft')}
              </Button>
              <Button variant="secondary" onClick={() => void submit(true)} loading={busy} className="text-sm">
                {L('समीक्षा हेतु सबमिट करें', 'Submit for Review')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
