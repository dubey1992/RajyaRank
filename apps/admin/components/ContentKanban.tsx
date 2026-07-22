'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { StatusBadge } from './WorkflowActions';
import { ReviewModal } from './ReviewModal';
import { ContentPreviewModal } from './ContentPreviewModal';

export interface KanbanItem {
  versionId: string;
  lessonId: string;
  titleHi: string;
  titleEn: string;
  status: string;
  updatedAt?: string;
}

export interface KanbanCaps {
  submit?: boolean;
  review?: boolean;
  approve?: boolean;
  publish?: boolean;
  unpublish?: boolean;
  archive?: boolean;
}

interface Column { key: string; hi: string; en: string; statuses: string[] }
const COLUMNS: Column[] = [
  { key: 'draft', hi: 'ड्राफ़्ट', en: 'Draft', statuses: ['DRAFT'] },
  { key: 'review', hi: 'समीक्षा में', en: 'Under review', statuses: ['SUBMITTED', 'UNDER_REVIEW'] },
  { key: 'correction', hi: 'सुधार आवश्यक', en: 'Correction required', statuses: ['CORRECTION_REQUIRED', 'REJECTED'] },
  { key: 'ready', hi: 'प्रकाशन हेतु तैयार', en: 'Ready / Published', statuses: ['APPROVED', 'READY_TO_PUBLISH', 'SCHEDULED', 'PUBLISHED'] },
];

interface Move { action: string; body?: unknown }

/** The transition implied by dropping a card of `status` into `targetCol`, if the
 *  caps allow it — else null (blocked). Mirrors the content-workflow state machine. */
function transitionFor(status: string, targetCol: string, caps: KanbanCaps): Move | null {
  if (targetCol === 'review') {
    if ((status === 'DRAFT' || status === 'CORRECTION_REQUIRED') && caps.submit) return { action: 'submit' };
    if (status === 'SUBMITTED' && caps.review) return { action: 'start-review' };
  }
  if (targetCol === 'correction' && (status === 'SUBMITTED' || status === 'UNDER_REVIEW') && caps.review) {
    return { action: 'request-correction', body: { body: 'Revision requested (moved on board).' } };
  }
  if (targetCol === 'ready') {
    if (status === 'UNDER_REVIEW' && caps.approve) return { action: 'approve' };
    if ((status === 'APPROVED' || status === 'READY_TO_PUBLISH' || status === 'SCHEDULED') && caps.publish) return { action: 'publish' };
  }
  return null;
}

export function ContentKanban({ items, locale, caps }: { items: KanbanItem[]; locale: 'hi' | 'en'; caps: KanbanCaps }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const router = useRouter();
  const title = (it: KanbanItem) => (hi ? it.titleHi : it.titleEn) || it.titleEn || it.titleHi || '—';

  const [review, setReview] = useState<KanbanItem | null>(null);
  const [preview, setPreview] = useState<KanbanItem | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: 'success' | 'error' } | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; danger: boolean; run: () => Promise<void> } | null>(null);

  async function post(versionId: string, action: string, body?: unknown) {
    await apiFetch(`/staff/content/versions/${versionId}/${action}`, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    router.refresh();
  }

  function ask(title: string, message: string, danger: boolean, run: () => Promise<void>) {
    setConfirm({ title, message, danger, run });
  }
  async function confirmRun() {
    if (!confirm) return;
    setBusy(true);
    try {
      await confirm.run();
      setToast({ text: L('हो गया।', 'Done.'), tone: 'success' });
    } catch (e) {
      const err = e as ApiError;
      setToast({
        text:
          err?.code === 'PERMISSION_DENIED'
            ? L('पहुँच अस्वीकृत।', 'Access denied.')
            : err?.code === 'CONTENT_STATE_INVALID' || err?.code === 'CONFLICT'
              ? L('यह आइटम अब इस स्थिति में नहीं है।', 'This item is no longer in that state.')
              : err?.message ?? L('क्रिया विफल रही।', 'Action failed.'),
        tone: 'error',
      });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  function onDrop(targetCol: string, e: React.DragEvent) {
    e.preventDefault();
    setDragOver(null);
    const versionId = e.dataTransfer.getData('versionId');
    const status = e.dataTransfer.getData('status');
    if (!versionId) return;
    const move = transitionFor(status, targetCol, caps);
    if (!move) {
      setToast({ text: L('यह कदम यहाँ मान्य/अनुमत नहीं है।', 'That move isn’t allowed here.'), tone: 'error' });
      return;
    }
    ask(L('क्रिया की पुष्टि करें', 'Confirm action'), `${move.action} — ${title(items.find((i) => i.versionId === versionId)!)}`, move.action === 'reject', () => post(versionId, move.action, move.body));
  }

  /** Buttons shown on a card, per status + caps. "View" is always available,
   *  regardless of status or capability, so anyone who can see the card can
   *  inspect its actual content — before, during, or after review. */
  function cardActions(it: KanbanItem) {
    const btns: { label: string; danger?: boolean; neutral?: boolean; onClick: () => void }[] = [
      { label: L('देखें', 'View'), neutral: true, onClick: () => setPreview(it) },
    ];
    const s = it.status;
    if ((s === 'DRAFT' || s === 'CORRECTION_REQUIRED') && caps.submit)
      btns.push({ label: L('समीक्षा हेतु भेजें', 'Submit'), onClick: () => ask(L('समीक्षा हेतु भेजें?', 'Submit for review?'), title(it), false, () => post(it.versionId, 'submit')) });
    if (s === 'SUBMITTED' && caps.review)
      btns.push({ label: L('समीक्षा शुरू', 'Start review'), onClick: () => ask(L('समीक्षा शुरू करें?', 'Start review?'), title(it), false, () => post(it.versionId, 'start-review')) });
    if (s === 'UNDER_REVIEW' && caps.review) btns.push({ label: L('समीक्षा करें', 'Review'), onClick: () => setReview(it) });
    if ((s === 'SUBMITTED' || s === 'UNDER_REVIEW') && caps.approve)
      btns.push({ label: L('अस्वीकार', 'Reject'), danger: true, onClick: () => ask(L('अस्वीकार करें?', 'Reject this content?'), title(it), true, () => post(it.versionId, 'reject', { reason: 'Rejected on board.' })) });
    if ((s === 'APPROVED' || s === 'READY_TO_PUBLISH' || s === 'SCHEDULED') && caps.publish)
      btns.push({ label: L('प्रकाशित करें', 'Publish'), onClick: () => ask(L('प्रकाशित करें?', 'Publish this content?'), title(it), false, () => post(it.versionId, 'publish')) });
    if (s === 'PUBLISHED' && caps.unpublish)
      btns.push({ label: L('प्रकाशन हटाएँ', 'Unpublish'), danger: true, onClick: () => ask(L('प्रकाशन हटाएँ?', 'Unpublish?'), title(it), true, () => post(it.versionId, 'unpublish', { reason: 'Unpublished on board.' })) });
    if (s !== 'ARCHIVED' && caps.archive)
      btns.push({ label: L('संग्रह', 'Archive'), danger: true, onClick: () => ask(L('संग्रहित करें?', 'Archive?'), title(it), true, () => post(it.versionId, 'archive')) });
    return btns;
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const cards = items.filter((it) => col.statuses.includes(it.status));
          return (
            <div
              key={col.key}
              onDragOver={(e) => { e.preventDefault(); setDragOver(col.key); }}
              onDragLeave={() => setDragOver((c) => (c === col.key ? null : c))}
              onDrop={(e) => onDrop(col.key, e)}
              className={`rounded-lg border bg-surface-soft/50 ${dragOver === col.key ? 'border-orange-500 ring-2 ring-orange-200' : 'border-line'}`}
            >
              <div className="flex items-center justify-between border-b border-line px-3 py-2">
                <span className="text-sm font-black text-navy-900">{hi ? col.hi : col.en}</span>
                <span className="rounded-full bg-navy-100 px-2 py-0.5 text-xs font-extrabold text-navy-900">{cards.length}</span>
              </div>
              <div className="grid gap-2 p-2">
                {cards.length === 0 ? (
                  <p className="px-1 py-4 text-center text-xs text-muted">{hi ? 'यहाँ खींचें' : 'Drop here'}</p>
                ) : (
                  cards.map((it) => (
                    <div
                      key={it.versionId}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('versionId', it.versionId);
                        e.dataTransfer.setData('status', it.status);
                      }}
                      className="cursor-grab rounded-md border border-line bg-white p-3 shadow-sm active:cursor-grabbing"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <span className="text-sm font-bold text-ink">{title(it)}</span>
                        <StatusBadge status={it.status} />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {cardActions(it).map((b) => (
                          <button
                            key={b.label}
                            type="button"
                            onClick={b.onClick}
                            className={`min-h-[32px] rounded-md px-2 text-xs font-extrabold ${b.danger ? 'border border-line text-danger hover:bg-orange-100/50' : b.neutral ? 'border border-line text-ink hover:bg-surface-soft' : 'bg-navy-900 text-white hover:bg-navy-800'}`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {review ? (
        <ReviewModal versionId={review.versionId} title={title(review)} locale={locale} onClose={() => setReview(null)} />
      ) : null}
      {preview ? <ContentPreviewModal versionId={preview.versionId} locale={locale} onClose={() => setPreview(null)} /> : null}
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ''}
        message={confirm?.message}
        confirmLabel={L('पुष्टि करें', 'Confirm')}
        cancelLabel={L('रद्द करें', 'Cancel')}
        tone={confirm?.danger ? 'danger' : 'default'}
        busy={busy}
        onConfirm={() => void confirmRun()}
        onCancel={() => setConfirm(null)}
      />
      <Toast message={toast?.text ?? null} tone={toast?.tone ?? 'success'} onDismiss={() => setToast(null)} />
    </>
  );
}
