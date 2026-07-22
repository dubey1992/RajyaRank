'use client';
import { useState } from 'react';
import { Alert, Button, Field, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';
import type { StudentPlanView, Exam } from '@rajyarank/contracts';

function rupees(minor: number) {
  return `₹${(minor / 100).toLocaleString('en-IN')}`;
}

export function StudentPlansManager({ initial, exams, locale }: { initial: StudentPlanView[]; exams: Exam[]; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [rows, setRows] = useState<StudentPlanView[]>(initial);
  const [toast, setToast] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const [examId, setExamId] = useState(''); // '' = Pro / all exams
  const [titleHi, setTitleHi] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [price, setPrice] = useState('');
  const [validityDays, setValidityDays] = useState('30');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function toggleActive(row: StudentPlanView) {
    setRowBusy(row.id);
    try {
      await apiFetch(`/admin/student-plans/${row.id}`, { method: 'PATCH', body: JSON.stringify({ active: !row.active }) });
      setRows((r) => r.map((x) => (x.id === row.id ? { ...x, active: !x.active } : x)));
    } catch (e) {
      setToast((e as ApiError).message);
    } finally {
      setRowBusy(null);
    }
  }

  async function create() {
    const errs: Record<string, string> = {};
    if (!titleHi.trim()) errs.titleHi = L('हिन्दी नाम दर्ज करें।', 'Enter the Hindi name.');
    if (!titleEn.trim()) errs.titleEn = L('English नाम दर्ज करें।', 'Enter the English name.');
    if (!price || Number(price) <= 0) errs.price = L('मूल्य दर्ज करें।', 'Enter a price.');
    if (!validityDays || Number(validityDays) <= 0) errs.validityDays = L('वैधता दिन दर्ज करें।', 'Enter validity in days.');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const created = await apiFetch<StudentPlanView>('/admin/student-plans', {
        method: 'POST',
        body: JSON.stringify({
          examId: examId || null,
          titleHi: titleHi.trim(),
          titleEn: titleEn.trim(),
          priceMinor: Math.round(Number(price) * 100),
          validityDays: Number(validityDays),
          active: true,
        }),
      });
      setRows((r) => [...r, created]);
      setExamId(''); setTitleHi(''); setTitleEn(''); setPrice(''); setValidityDays('30'); setErrors({});
      setToast(L('योजना बनाई गई।', 'Plan created.'));
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  const mini = 'rounded-md border border-line px-2 py-1 text-xs font-bold hover:bg-surface-soft disabled:opacity-50';

  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('छात्र योजनाएँ', 'Student Plans')} ({rows.length})</h2>
      {rows.length === 0 ? (
        <p className="mb-4 text-sm text-muted">{L('अभी कोई योजना नहीं।', 'No plans yet.')}</p>
      ) : (
        <div className="mb-4 overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-soft text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">{L('योजना', 'Plan')}</th>
                <th className="px-3 py-2">{L('दायरा', 'Scope')}</th>
                <th className="px-3 py-2">{L('मूल्य', 'Price')}</th>
                <th className="px-3 py-2">{L('वैधता', 'Validity')}</th>
                <th className="px-3 py-2">{L('स्थिति', 'Status')}</th>
                <th className="px-3 py-2 text-right">{L('कार्रवाई', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2 font-bold text-ink">{hi ? p.titleHi : p.titleEn}</td>
                  <td className="px-3 py-2">
                    {p.examId ? (
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-extrabold text-success">{hi ? p.examNameHi : p.examNameEn}</span>
                    ) : (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-extrabold text-orange-600">{L('सभी परीक्षाएँ (Pro)', 'All exams (Pro)')}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{rupees(p.priceMinor)}</td>
                  <td className="px-3 py-2">{L(`${p.validityDays} दिन`, `${p.validityDays} days`)}</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${p.active ? 'bg-teal-100 text-success' : 'bg-orange-100 text-danger'}`}>{p.active ? L('सक्रिय', 'Active') : L('निष्क्रिय', 'Inactive')}</span></td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" disabled={rowBusy === p.id} className={mini} onClick={() => void toggleActive(p)}>
                      {p.active ? L('निष्क्रिय करें', 'Deactivate') : L('सक्रिय करें', 'Activate')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="mb-2 text-sm font-extrabold text-navy-900">{L('नई योजना', 'New plan')}</h3>
      {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
      <form noValidate onSubmit={(e) => { e.preventDefault(); void create(); }} className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-bold text-muted">{L('परीक्षा (खाली = Pro, सभी)', 'Exam (blank = Pro, all)')}</label>
          <select value={examId} onChange={(e) => setExamId(e.target.value)} className="w-full rounded-md border border-line px-3 py-3 text-sm">
            <option value="">{L('— सभी परीक्षाएँ (Pro) —', '— All exams (Pro) —')}</option>
            {exams.map((ex) => <option key={ex.id} value={ex.id}>{hi ? ex.nameHi : ex.nameEn}</option>)}
          </select>
        </div>
        <Field label={L('नाम (हिन्दी)', 'Name (Hindi)')} name="titleHi" value={titleHi} error={errors.titleHi} onChange={(e) => setTitleHi(e.target.value)} placeholder={L('जैसे: RajyaRank Plus — BPSC', 'e.g. RajyaRank Plus — BPSC')} />
        <Field label={L('नाम (English)', 'Name (English)')} name="titleEn" value={titleEn} error={errors.titleEn} onChange={(e) => setTitleEn(e.target.value)} />
        <Field label={L('मूल्य (₹)', 'Price (₹)')} name="price" inputMode="numeric" value={price} error={errors.price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))} />
        <Field label={L('वैधता (दिन)', 'Validity (days)')} name="validityDays" inputMode="numeric" value={validityDays} error={errors.validityDays} onChange={(e) => setValidityDays(e.target.value.replace(/\D/g, ''))} />
        <div className="sm:col-span-3">
          <Button type="submit" loading={busy} className="w-full">{L('योजना बनाएँ', 'Create plan')}</Button>
        </div>
      </form>
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </section>
  );
}
