'use client';
import { useState } from 'react';
import { Alert, Button, Field, Toast, ConfirmDialog } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';
import type { TestimonialView } from '@rajyarank/contracts';

export function TestimonialsManager({ initial, locale }: { initial: TestimonialView[]; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [rows, setRows] = useState<TestimonialView[]>(initial);
  const [toast, setToast] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [del, setDel] = useState<TestimonialView | null>(null);

  const [quoteHi, setQuoteHi] = useState('');
  const [quoteEn, setQuoteEn] = useState('');
  const [studentName, setStudentName] = useState('');
  const [initials, setInitials] = useState('');
  const [examLabel, setExamLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function create() {
    const errs: Record<string, string> = {};
    if (!quoteHi.trim()) errs.quoteHi = L('हिन्दी उद्धरण दर्ज करें।', 'Enter the Hindi quote.');
    if (!quoteEn.trim()) errs.quoteEn = L('English उद्धरण दर्ज करें।', 'Enter the English quote.');
    if (!studentName.trim()) errs.studentName = L('छात्र का नाम दर्ज करें।', 'Enter the student name.');
    if (!initials.trim()) errs.initials = L('आद्याक्षर दर्ज करें।', 'Enter initials.');
    if (!examLabel.trim()) errs.examLabel = L('परीक्षा दर्ज करें।', 'Enter the exam label.');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const created = await apiFetch<TestimonialView>('/admin/marketing/testimonials', {
        method: 'POST',
        body: JSON.stringify({ quoteHi: quoteHi.trim(), quoteEn: quoteEn.trim(), studentName: studentName.trim(), initials: initials.trim().toUpperCase(), examLabel: examLabel.trim(), sequence: rows.length }),
      });
      setRows((r) => [...r, created]);
      setQuoteHi(''); setQuoteEn(''); setStudentName(''); setInitials(''); setExamLabel(''); setErrors({});
      setToast(L('प्रशंसापत्र जोड़ा गया।', 'Testimonial added.'));
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(row: TestimonialView) {
    setRowBusy(row.id);
    try {
      await apiFetch(`/admin/marketing/testimonials/${row.id}`, { method: 'PATCH', body: JSON.stringify({ published: !row.published }) });
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
      await apiFetch(`/admin/marketing/testimonials/${del.id}`, { method: 'DELETE' });
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
      <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('प्रशंसापत्र', 'Testimonials')} ({rows.length})</h2>
      {rows.length === 0 ? (
        <p className="mb-4 text-sm text-muted">{L('अभी कोई प्रशंसापत्र नहीं।', 'No testimonials yet.')}</p>
      ) : (
        <ul className="mb-4 grid gap-2">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-3 rounded-md border border-line p-3">
              <div className="min-w-0">
                <div className="font-bold text-ink">{r.studentName} <span className="text-xs text-muted">· {r.examLabel} · {r.initials}</span></div>
                <div className="mt-0.5 truncate text-sm text-muted">{hi ? r.quoteHi : r.quoteEn}</div>
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

      <h3 className="mb-2 text-sm font-extrabold text-navy-900">{L('नया प्रशंसापत्र', 'New testimonial')}</h3>
      {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
      <form noValidate onSubmit={(e) => { e.preventDefault(); void create(); }} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-extrabold text-ink">{L('उद्धरण (हिन्दी)', 'Quote (Hindi)')}</label>
          <textarea value={quoteHi} onChange={(e) => setQuoteHi(e.target.value)} className="min-h-[70px] w-full rounded-md border border-line px-3 py-2 text-sm" />
          {errors.quoteHi ? <p className="mt-1 text-sm text-danger">{errors.quoteHi}</p> : null}
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-extrabold text-ink">{L('उद्धरण (English)', 'Quote (English)')}</label>
          <textarea value={quoteEn} onChange={(e) => setQuoteEn(e.target.value)} className="min-h-[70px] w-full rounded-md border border-line px-3 py-2 text-sm" />
          {errors.quoteEn ? <p className="mt-1 text-sm text-danger">{errors.quoteEn}</p> : null}
        </div>
        <Field label={L('छात्र का नाम', 'Student name')} name="studentName" value={studentName} error={errors.studentName} onChange={(e) => setStudentName(e.target.value)} />
        <Field label={L('आद्याक्षर', 'Initials')} name="initials" value={initials} error={errors.initials} onChange={(e) => setInitials(e.target.value.toUpperCase())} />
        <Field label={L('परीक्षा', 'Exam')} name="examLabel" value={examLabel} error={errors.examLabel} onChange={(e) => setExamLabel(e.target.value)} />
        <div className="sm:col-span-2">
          <Button type="submit" loading={busy} className="w-full">{L('जोड़ें', 'Add testimonial')}</Button>
        </div>
      </form>

      <ConfirmDialog
        open={!!del}
        title={L('प्रशंसापत्र हटाएँ?', 'Delete testimonial?')}
        message={del ? `"${del.studentName}"` : ''}
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
