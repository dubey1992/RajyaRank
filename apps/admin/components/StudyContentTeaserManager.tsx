'use client';
import { useState } from 'react';
import { Alert, Button, Field, Toast, ConfirmDialog } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';
import type { StudyContentTeaserView, StudyContentKindValue } from '@rajyarank/contracts';

const KINDS: StudyContentKindValue[] = ['VIDEO', 'PDF', 'TEST', 'PACK'];

export function StudyContentTeaserManager({ initial, locale }: { initial: StudyContentTeaserView[]; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [rows, setRows] = useState<StudyContentTeaserView[]>(initial);
  const [toast, setToast] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [del, setDel] = useState<StudyContentTeaserView | null>(null);

  const [kind, setKind] = useState<StudyContentKindValue>('VIDEO');
  const [titleHi, setTitleHi] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [descHi, setDescHi] = useState('');
  const [descEn, setDescEn] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function create() {
    const errs: Record<string, string> = {};
    if (!titleHi.trim()) errs.titleHi = L('हिन्दी शीर्षक दर्ज करें।', 'Enter the Hindi title.');
    if (!titleEn.trim()) errs.titleEn = L('English शीर्षक दर्ज करें।', 'Enter the English title.');
    if (!descHi.trim()) errs.descHi = L('हिन्दी विवरण दर्ज करें।', 'Enter the Hindi description.');
    if (!descEn.trim()) errs.descEn = L('English विवरण दर्ज करें।', 'Enter the English description.');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const created = await apiFetch<StudyContentTeaserView>('/admin/marketing/study-content-teasers', {
        method: 'POST',
        body: JSON.stringify({ kind, titleHi: titleHi.trim(), titleEn: titleEn.trim(), descHi: descHi.trim(), descEn: descEn.trim(), sequence: rows.length }),
      });
      setRows((r) => [...r, created]);
      setTitleHi(''); setTitleEn(''); setDescHi(''); setDescEn(''); setErrors({});
      setToast(L('जोड़ा गया।', 'Added.'));
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(row: StudyContentTeaserView) {
    setRowBusy(row.id);
    try {
      await apiFetch(`/admin/marketing/study-content-teasers/${row.id}`, { method: 'PATCH', body: JSON.stringify({ published: !row.published }) });
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
      await apiFetch(`/admin/marketing/study-content-teasers/${del.id}`, { method: 'DELETE' });
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
      <h2 className="mb-1 text-lg font-extrabold text-navy-900">{L('अध्ययन सामग्री टीज़र', 'Study Content teaser')} ({rows.length})</h2>
      <p className="mb-3 text-xs text-muted">{L('मार्केटिंग होमपेज पर "अध्ययन सामग्री अलग से खरीदें" अनुभाग — अभी खरीद सक्रिय नहीं है, केवल पूर्वावलोकन।', 'The homepage "Buy individual study content" section — purchase isn’t live yet, preview copy only.')}</p>
      {rows.length === 0 ? (
        <p className="mb-4 text-sm text-muted">{L('अभी कोई आइटम नहीं।', 'No items yet.')}</p>
      ) : (
        <ul className="mb-4 grid gap-2">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-3 rounded-md border border-line p-3">
              <div className="min-w-0">
                <div className="font-bold text-ink">{hi ? r.titleHi : r.titleEn} <span className="text-xs text-muted">· {r.kind}</span></div>
                <div className="mt-0.5 truncate text-sm text-muted">{hi ? r.descHi : r.descEn}</div>
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

      <h3 className="mb-2 text-sm font-extrabold text-navy-900">{L('नया आइटम', 'New item')}</h3>
      {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
      <form noValidate onSubmit={(e) => { e.preventDefault(); void create(); }} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-extrabold text-ink">{L('प्रकार', 'Kind')}</label>
          <select value={kind} onChange={(e) => setKind(e.target.value as StudyContentKindValue)} className="w-full rounded-md border border-line px-3 py-3 text-sm">
            {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <Field label={L('शीर्षक (हिन्दी)', 'Title (Hindi)')} name="titleHi" value={titleHi} error={errors.titleHi} onChange={(e) => setTitleHi(e.target.value)} />
        <Field label={L('शीर्षक (English)', 'Title (English)')} name="titleEn" value={titleEn} error={errors.titleEn} onChange={(e) => setTitleEn(e.target.value)} />
        <div>
          <label className="mb-1 block text-sm font-extrabold text-ink">{L('विवरण (हिन्दी)', 'Description (Hindi)')}</label>
          <textarea value={descHi} onChange={(e) => setDescHi(e.target.value)} className="min-h-[60px] w-full rounded-md border border-line px-3 py-2 text-sm" />
          {errors.descHi ? <p className="mt-1 text-sm text-danger">{errors.descHi}</p> : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-extrabold text-ink">{L('विवरण (English)', 'Description (English)')}</label>
          <textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} className="min-h-[60px] w-full rounded-md border border-line px-3 py-2 text-sm" />
          {errors.descEn ? <p className="mt-1 text-sm text-danger">{errors.descEn}</p> : null}
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" loading={busy} className="w-full">{L('जोड़ें', 'Add item')}</Button>
        </div>
      </form>

      <ConfirmDialog
        open={!!del}
        title={L('आइटम हटाएँ?', 'Delete item?')}
        message={del ? (hi ? del.titleHi : del.titleEn) : ''}
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
