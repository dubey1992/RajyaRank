'use client';
import { useState } from 'react';
import { Alert, Button, Field, Toast, ConfirmDialog } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';
import type { FaqView } from '@rajyarank/contracts';

export function FaqManager({ initial, locale }: { initial: FaqView[]; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [rows, setRows] = useState<FaqView[]>(initial);
  const [toast, setToast] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [del, setDel] = useState<FaqView | null>(null);

  const [questionHi, setQuestionHi] = useState('');
  const [questionEn, setQuestionEn] = useState('');
  const [answerHi, setAnswerHi] = useState('');
  const [answerEn, setAnswerEn] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function create() {
    const errs: Record<string, string> = {};
    if (!questionHi.trim()) errs.questionHi = L('हिन्दी प्रश्न दर्ज करें।', 'Enter the Hindi question.');
    if (!questionEn.trim()) errs.questionEn = L('English प्रश्न दर्ज करें।', 'Enter the English question.');
    if (!answerHi.trim()) errs.answerHi = L('हिन्दी उत्तर दर्ज करें।', 'Enter the Hindi answer.');
    if (!answerEn.trim()) errs.answerEn = L('English उत्तर दर्ज करें।', 'Enter the English answer.');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const created = await apiFetch<FaqView>('/admin/marketing/faqs', {
        method: 'POST',
        body: JSON.stringify({ questionHi: questionHi.trim(), questionEn: questionEn.trim(), answerHi: answerHi.trim(), answerEn: answerEn.trim(), sequence: rows.length }),
      });
      setRows((r) => [...r, created]);
      setQuestionHi(''); setQuestionEn(''); setAnswerHi(''); setAnswerEn(''); setErrors({});
      setToast(L('प्रश्न जोड़ा गया।', 'FAQ added.'));
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(row: FaqView) {
    setRowBusy(row.id);
    try {
      await apiFetch(`/admin/marketing/faqs/${row.id}`, { method: 'PATCH', body: JSON.stringify({ published: !row.published }) });
      setRows((r) => r.map((x) => (x.id === row.id ? { ...x, published: !x.published } : x)));
    } catch (e) {
      setToast((e as ApiError).message);
    } finally {
      setRowBusy(null);
    }
  }

  async function remove() {
    if (!del) return;
    setRowBusy(del.id);
    try {
      await apiFetch(`/admin/marketing/faqs/${del.id}`, { method: 'DELETE' });
      setRows((r) => r.filter((x) => x.id !== del.id));
      setToast(L('हटाया गया।', 'Deleted.'));
    } catch (e) {
      setToast((e as ApiError).message);
    } finally {
      setRowBusy(null);
      setDel(null);
    }
  }

  const mini = 'rounded-md border border-line px-2 py-1 text-xs font-bold hover:bg-surface-soft disabled:opacity-50';

  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('सामान्य प्रश्न', 'FAQ')} ({rows.length})</h2>
      {rows.length === 0 ? (
        <p className="mb-4 text-sm text-muted">{L('अभी कोई प्रश्न नहीं।', 'No FAQs yet.')}</p>
      ) : (
        <ul className="mb-4 grid gap-2">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-3 rounded-md border border-line p-3">
              <div className="min-w-0">
                <div className="font-bold text-ink">{hi ? r.questionHi : r.questionEn}</div>
                <div className="mt-0.5 truncate text-sm text-muted">{hi ? r.answerHi : r.answerEn}</div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button type="button" disabled={rowBusy === r.id} className={mini} onClick={() => void togglePublished(r)}>
                  {r.published ? L('अप्रकाशित करें', 'Unpublish') : L('प्रकाशित करें', 'Publish')}
                </button>
                <button type="button" disabled={rowBusy === r.id} className={`${mini} text-danger`} onClick={() => setDel(r)}>{L('हटाएँ', 'Delete')}</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mb-2 text-sm font-extrabold text-navy-900">{L('नया प्रश्न', 'New FAQ')}</h3>
      {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
      <form noValidate onSubmit={(e) => { e.preventDefault(); void create(); }} className="grid gap-3">
        <Field label={L('प्रश्न (हिन्दी)', 'Question (Hindi)')} name="questionHi" value={questionHi} error={errors.questionHi} onChange={(e) => setQuestionHi(e.target.value)} />
        <Field label={L('प्रश्न (English)', 'Question (English)')} name="questionEn" value={questionEn} error={errors.questionEn} onChange={(e) => setQuestionEn(e.target.value)} />
        <div>
          <label className="mb-1 block text-sm font-extrabold text-ink">{L('उत्तर (हिन्दी)', 'Answer (Hindi)')}</label>
          <textarea value={answerHi} onChange={(e) => setAnswerHi(e.target.value)} className="min-h-[70px] w-full rounded-md border border-line px-3 py-2 text-sm" />
          {errors.answerHi ? <p className="mt-1 text-sm text-danger">{errors.answerHi}</p> : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-extrabold text-ink">{L('उत्तर (English)', 'Answer (English)')}</label>
          <textarea value={answerEn} onChange={(e) => setAnswerEn(e.target.value)} className="min-h-[70px] w-full rounded-md border border-line px-3 py-2 text-sm" />
          {errors.answerEn ? <p className="mt-1 text-sm text-danger">{errors.answerEn}</p> : null}
        </div>
        <Button type="submit" loading={busy} className="w-full">{L('जोड़ें', 'Add FAQ')}</Button>
      </form>

      <ConfirmDialog
        open={!!del}
        title={L('प्रश्न हटाएँ?', 'Delete FAQ?')}
        message={del ? (hi ? del.questionHi : del.questionEn) : ''}
        confirmLabel={L('हटाएँ', 'Delete')}
        cancelLabel={L('रद्द करें', 'Cancel')}
        tone="danger"
        busy={rowBusy === del?.id}
        onConfirm={() => void remove()}
        onCancel={() => setDel(null)}
      />
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </section>
  );
}
