'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, ConfirmDialog } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';

export interface QuestionItem {
  id: string;
  currentVersion: {
    id: string;
    type: string;
    textEn: string | null;
    textHi: string | null;
    status: string;
    difficulty: string;
    marks: number;
  } | null;
  subject: {
    id: string;
    nameHi: string;
    nameEn: string;
    courseId: string;
    course: { id: string; code: string; titleHi: string; titleEn: string };
  } | null;
}

const STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-line text-muted',
  SUBMITTED: 'bg-[#fff7d6] text-[#966700]',
  UNDER_REVIEW: 'bg-orange-100 text-warning',
  CORRECTION_REQUIRED: 'bg-orange-100 text-danger',
  APPROVED: 'bg-teal-100 text-success',
  PUBLISHED: 'bg-teal-100 text-success',
};

/** Question Bank browsing: Course -> Questions, not a flat creation-order
 *  list — click a course to see just its questions. Each question also
 *  carries the review action its status/the viewer's permissions allow:
 *  Submit for review (DRAFT/CORRECTION_REQUIRED, question.create), Start
 *  review (SUBMITTED, content.review — the policy engine only lets
 *  content.approve act on UNDER_REVIEW, never SUBMITTED directly, so this
 *  step is required, not optional), or Approve (UNDER_REVIEW,
 *  content.approve). The API already had submit/approve; nothing in the
 *  admin UI ever called them, so questions sat in DRAFT with no way to
 *  move toward being usable in a test. */
export function QuestionBankBrowser({
  questions,
  locale = 'en',
  canSubmit,
  canReview,
  canApprove,
  canDelete,
}: {
  questions: QuestionItem[];
  locale?: string;
  canSubmit: boolean;
  canReview: boolean;
  canApprove: boolean;
  canDelete?: boolean;
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const router = useRouter();
  const [openCourseId, setOpenCourseId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  function toggleSelected(questionId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }

  async function deleteSelected() {
    if (!selected.size) return;
    setDeleting(true);
    setError(null);
    try {
      await apiFetch('/staff/questions/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ questionIds: [...selected] }),
      });
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      setError((e as ApiError).message ?? L('हटाना विफल रहा।', 'Delete failed.'));
    } finally {
      setConfirmDeleteOpen(false);
      setDeleting(false);
    }
  }

  const courses = useMemo(() => {
    const byId = new Map<string, { id: string; code: string; title: string; count: number }>();
    for (const q of questions) {
      const c = q.subject?.course;
      if (!c) continue;
      const existing = byId.get(c.id);
      const title = hi ? c.titleHi : c.titleEn;
      if (existing) existing.count += 1;
      else byId.set(c.id, { id: c.id, code: c.code, title, count: 1 });
    }
    return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title));
  }, [questions, hi]);

  const unscoped = questions.filter((q) => !q.subject?.course);
  const openQuestions = openCourseId ? questions.filter((q) => q.subject?.courseId === openCourseId) : [];

  async function runAction(versionId: string, path: string) {
    setBusyId(versionId);
    setError(null);
    try {
      await apiFetch(`/staff/questions/versions/${versionId}/${path}`, { method: 'POST' });
      router.refresh();
    } catch (e) {
      // Real failure modes here: the actor's scope no longer covers this
      // question, or its status moved (e.g. someone else already reviewed
      // it) — both worth telling the user about, not a silent no-op button.
      setError((e as ApiError).message ?? L('कार्रवाई विफल रही।', 'Action failed.'));
    } finally {
      setBusyId(null);
    }
  }

  const submitForReview = (versionId: string) => runAction(versionId, 'submit');
  const startReview = (versionId: string) => runAction(versionId, 'start-review');
  const approve = (versionId: string) => runAction(versionId, 'approve');

  if (questions.length === 0) {
    return (
      <p className="text-sm text-muted">
        {hi
          ? 'अभी कोई प्रश्न नहीं। बाईं ओर से एक प्रश्न बनाएँ, या CSV बल्क-इम्पोर्ट का उपयोग करें।'
          : 'No questions yet. Create one on the left, or use CSV bulk-import.'}
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {canDelete ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-white p-3">
          <span className="text-xs text-muted">
            {selected.size
              ? L(`${selected.size} चयनित`, `${selected.size} selected`)
              : L('हटाने के लिए प्रश्न चुनें।', 'Select questions to delete.')}
          </span>
          <Button
            type="button"
            variant="danger"
            disabled={selected.size === 0}
            onClick={() => setConfirmDeleteOpen(true)}
            className="min-h-[32px] px-3 text-xs"
          >
            {L(`चयनित हटाएँ (${selected.size})`, `Delete selected (${selected.size})`)}
          </Button>
        </div>
      ) : null}
      {courses.map((c) => (
        <div key={c.id} className="rounded-md border border-line bg-white">
          <button
            type="button"
            onClick={() => setOpenCourseId(openCourseId === c.id ? null : c.id)}
            className="flex w-full items-center justify-between gap-3 p-3 text-left"
          >
            <span className="font-bold text-ink">{c.title} <span className="font-normal text-muted">({c.code})</span></span>
            <span className="flex items-center gap-2 text-xs text-muted">
              {c.count} {L('प्रश्न', 'questions')}
              <span className="text-base leading-none">{openCourseId === c.id ? '−' : '+'}</span>
            </span>
          </button>
          {openCourseId === c.id ? (
            <ul className="grid gap-2 border-t border-line p-3">
              {openQuestions.map((q) => (
                <QuestionRow
                  key={q.id}
                  q={q}
                  hi={hi}
                  L={L}
                  canSubmit={canSubmit}
                  canReview={canReview}
                  canApprove={canApprove}
                  busy={busyId === q.currentVersion?.id}
                  onSubmit={() => q.currentVersion && void submitForReview(q.currentVersion.id)}
                  onStartReview={() => q.currentVersion && void startReview(q.currentVersion.id)}
                  onApprove={() => q.currentVersion && void approve(q.currentVersion.id)}
                  canDelete={canDelete}
                  selected={selected.has(q.id)}
                  onToggleSelected={() => toggleSelected(q.id)}
                />
              ))}
            </ul>
          ) : null}
        </div>
      ))}

      {unscoped.length ? (
        <div className="rounded-md border border-line bg-white p-3">
          <h3 className="mb-2 text-sm font-extrabold text-navy-900">{L('अन्य प्रश्न', 'Other questions')}</h3>
          <ul className="grid gap-2">
            {unscoped.map((q) => (
              <QuestionRow
                key={q.id}
                q={q}
                hi={hi}
                L={L}
                canSubmit={canSubmit}
                canReview={canReview}
                canApprove={canApprove}
                busy={busyId === q.currentVersion?.id}
                onSubmit={() => q.currentVersion && void submitForReview(q.currentVersion.id)}
                onStartReview={() => q.currentVersion && void startReview(q.currentVersion.id)}
                onApprove={() => q.currentVersion && void approve(q.currentVersion.id)}
                canDelete={canDelete}
                selected={selected.has(q.id)}
                onToggleSelected={() => toggleSelected(q.id)}
              />
            ))}
          </ul>
        </div>
      ) : null}
      <ConfirmDialog
        open={confirmDeleteOpen}
        title={L('चयनित प्रश्न हटाएँ?', 'Delete selected questions?')}
        message={L(
          `${selected.size} प्रश्न स्थायी रूप से हटाए जाएँगे। यह क्रिया पूर्ववत नहीं की जा सकती।`,
          `${selected.size} question(s) will be removed everywhere they're listed. This cannot be undone from the UI.`,
        )}
        confirmLabel={L('हटाएँ', 'Delete')}
        cancelLabel={L('रद्द करें', 'Cancel')}
        tone="danger"
        busy={deleting}
        onConfirm={() => void deleteSelected()}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}

function QuestionRow({
  q,
  hi,
  L,
  canSubmit,
  canReview,
  canApprove,
  busy,
  onSubmit,
  onStartReview,
  onApprove,
  canDelete,
  selected,
  onToggleSelected,
}: {
  q: QuestionItem;
  hi: boolean;
  L: (h: string, e: string) => string;
  canSubmit: boolean;
  canReview: boolean;
  canApprove: boolean;
  busy: boolean;
  onSubmit: () => void;
  onStartReview: () => void;
  onApprove: () => void;
  canDelete?: boolean;
  selected?: boolean;
  onToggleSelected?: () => void;
}) {
  const status = q.currentVersion?.status ?? 'DRAFT';
  const showSubmit = canSubmit && (status === 'DRAFT' || status === 'CORRECTION_REQUIRED');
  const showStartReview = canReview && status === 'SUBMITTED';
  const showApprove = canApprove && status === 'UNDER_REVIEW';
  return (
    <li className="rounded-md border border-line bg-surface-soft p-3">
      <div className="flex items-start justify-between gap-3">
        <span className="flex items-start gap-2 text-sm font-bold text-ink">
          {canDelete ? (
            <input
              type="checkbox"
              checked={selected ?? false}
              onChange={onToggleSelected}
              aria-label={L('यह प्रश्न चुनें', 'Select this question')}
              className="mt-0.5"
            />
          ) : null}
          {(hi ? q.currentVersion?.textHi : q.currentVersion?.textEn) ?? q.currentVersion?.textEn ?? q.currentVersion?.textHi ?? '—'}
        </span>
        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-black ${STATUS_TONE[status] ?? 'bg-line'}`}>{status}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="text-xs text-muted">
          {q.currentVersion?.type} · {q.currentVersion?.difficulty} · {q.currentVersion?.marks} {L('अंक', 'mark(s)')}
        </span>
        {showSubmit ? (
          <Button type="button" variant="secondary" loading={busy} onClick={onSubmit} className="min-h-[32px] px-3 text-xs">
            {L('समीक्षा हेतु भेजें', 'Submit for review')}
          </Button>
        ) : showStartReview ? (
          <Button type="button" variant="secondary" loading={busy} onClick={onStartReview} className="min-h-[32px] px-3 text-xs">
            {L('समीक्षा शुरू करें', 'Start review')}
          </Button>
        ) : showApprove ? (
          <Button type="button" loading={busy} onClick={onApprove} className="min-h-[32px] px-3 text-xs">
            {L('स्वीकृत करें', 'Approve')}
          </Button>
        ) : null}
      </div>
    </li>
  );
}
