'use client';
import { useState } from 'react';
import { Alert, Button, Field, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';
import { StatusBadge } from '@/components/WorkflowActions';
import type { CurrentAffairScope, CurrentAffairView } from '@rajyarank/contracts';

const SCOPES: { value: CurrentAffairScope; hi: string; en: string }[] = [
  { value: 'NATIONAL', hi: 'राष्ट्रीय', en: 'National' },
  { value: 'BIHAR', hi: 'बिहार', en: 'Bihar' },
  { value: 'JHARKHAND', hi: 'झारखंड', en: 'Jharkhand' },
];

const EDITABLE_FROM = new Set(['DRAFT', 'CORRECTION_REQUIRED']);

const emptyForm = {
  dateFor: new Date().toISOString().slice(0, 10),
  titleHi: '',
  titleEn: '',
  bodyHi: '',
  bodyEn: '',
  category: '',
  scope: 'NATIONAL' as CurrentAffairScope,
  source: '',
};

export function CurrentAffairsManager({
  initial,
  canMake,
  canCheck,
  locale,
}: {
  initial: CurrentAffairView[];
  canMake: boolean;
  canCheck: boolean;
  locale: 'hi' | 'en';
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [rows, setRows] = useState<CurrentAffairView[]>(initial);
  const [toast, setToast] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [reasonPromptId, setReasonPromptId] = useState<{ id: string; kind: 'correction' | 'unpublish' } | null>(null);
  const [reasonInput, setReasonInput] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startEdit(row: CurrentAffairView) {
    setEditingId(row.id);
    setForm({
      dateFor: row.dateFor.slice(0, 10),
      titleHi: row.titleHi,
      titleEn: row.titleEn,
      bodyHi: row.bodyHi,
      bodyEn: row.bodyEn,
      category: row.category,
      scope: row.scope,
      source: row.source ?? '',
    });
    setErrors({});
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.titleHi.trim()) errs.titleHi = L('हिन्दी शीर्षक दर्ज करें।', 'Enter the Hindi title.');
    if (!form.titleEn.trim()) errs.titleEn = L('English शीर्षक दर्ज करें।', 'Enter the English title.');
    if (!form.bodyHi.trim()) errs.bodyHi = L('हिन्दी विवरण दर्ज करें।', 'Enter the Hindi body.');
    if (!form.bodyEn.trim()) errs.bodyEn = L('English विवरण दर्ज करें।', 'Enter the English body.');
    if (!form.category.trim()) errs.category = L('श्रेणी दर्ज करें।', 'Enter a category.');
    if (!form.dateFor) errs.dateFor = L('दिनांक दर्ज करें।', 'Enter a date.');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setBusy(true);
    try {
      const payload = {
        dateFor: form.dateFor,
        titleHi: form.titleHi.trim(),
        titleEn: form.titleEn.trim(),
        bodyHi: form.bodyHi.trim(),
        bodyEn: form.bodyEn.trim(),
        category: form.category.trim(),
        scope: form.scope,
        source: form.source.trim() || undefined,
      };
      if (editingId) {
        const updated = await apiFetch<CurrentAffairView>(`/admin/current-affairs/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        setRows((r) => r.map((x) => (x.id === editingId ? updated : x)));
        setToast(L('अपडेट किया गया।', 'Updated.'));
      } else {
        const created = await apiFetch<CurrentAffairView>('/admin/current-affairs', { method: 'POST', body: JSON.stringify(payload) });
        setRows((r) => [created, ...r]);
        setToast(L('ड्राफ्ट बनाया गया।', 'Draft created.'));
      }
      cancelEdit();
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  async function act(id: string, action: 'submit' | 'publish' | 'archive', body?: unknown) {
    setRowBusy(id);
    try {
      const updated = await apiFetch<CurrentAffairView>(`/admin/current-affairs/${id}/${action}`, {
        method: 'POST',
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      setRows((r) => r.map((x) => (x.id === id ? updated : x)));
    } catch (e) {
      setToast((e as ApiError).message);
    } finally {
      setRowBusy(null);
    }
  }

  async function submitReason() {
    if (!reasonPromptId) return;
    if (!reasonInput.trim()) return;
    const { id, kind } = reasonPromptId;
    setRowBusy(id);
    try {
      const path = kind === 'correction' ? `/admin/current-affairs/${id}/request-correction` : `/admin/current-affairs/${id}/unpublish`;
      const body = kind === 'correction' ? { body: reasonInput.trim() } : { reason: reasonInput.trim() };
      const updated = await apiFetch<CurrentAffairView>(path, { method: 'POST', body: JSON.stringify(body) });
      setRows((r) => r.map((x) => (x.id === id ? updated : x)));
      setReasonPromptId(null);
      setReasonInput('');
    } catch (e) {
      setToast((e as ApiError).message);
    } finally {
      setRowBusy(null);
    }
  }

  const scopeLabel = (s: CurrentAffairScope) => SCOPES.find((x) => x.value === s)?.[hi ? 'hi' : 'en'] ?? s;

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-3 text-lg font-extrabold text-navy-900">
          {L('करेंट अफेयर्स', 'Current Affairs')} ({rows.length})
        </h2>
        {rows.length === 0 ? (
          <p className="mb-4 text-sm text-muted">{L('अभी कुछ नहीं है।', 'Nothing here yet.')}</p>
        ) : (
          <div className="mb-2 overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-soft text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">{L('दिनांक', 'Date')}</th>
                  <th className="px-3 py-2">{L('शीर्षक', 'Title')}</th>
                  <th className="px-3 py-2">{L('श्रेणी', 'Category')}</th>
                  <th className="px-3 py-2">{L('दायरा', 'Scope')}</th>
                  <th className="px-3 py-2">{L('स्थिति', 'Status')}</th>
                  <th className="px-3 py-2 text-right">{L('कार्रवाई', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => {
                  const canEditRow = canMake && EDITABLE_FROM.has(r.status);
                  const busy = rowBusy === r.id;
                  return (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap px-3 py-2 text-muted">{r.dateFor.slice(0, 10)}</td>
                      <td className="px-3 py-2 font-bold text-ink">
                        {hi ? r.titleHi : r.titleEn}
                        {r.status === 'CORRECTION_REQUIRED' && r.correctionReason ? (
                          <p className="mt-1 max-w-xs text-xs font-normal text-danger">
                            {L('सुधार टिप्पणी', 'Correction note')}: {r.correctionReason}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-muted">{r.category}</td>
                      <td className="px-3 py-2 text-muted">{scopeLabel(r.scope)}</td>
                      <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {canEditRow ? (
                            <button type="button" disabled={busy} className="rounded-md border border-line px-2 py-1 text-xs font-bold hover:bg-surface-soft disabled:opacity-50" onClick={() => startEdit(r)}>
                              {L('संपादित करें', 'Edit')}
                            </button>
                          ) : null}
                          {canMake && EDITABLE_FROM.has(r.status) ? (
                            <button type="button" disabled={busy} className="rounded-md border border-line px-2 py-1 text-xs font-bold hover:bg-surface-soft disabled:opacity-50" onClick={() => void act(r.id, 'submit')}>
                              {L('सबमिट करें', 'Submit')}
                            </button>
                          ) : null}
                          {canCheck && r.status === 'SUBMITTED' ? (
                            <>
                              <button type="button" disabled={busy} className="rounded-md border border-line px-2 py-1 text-xs font-bold hover:bg-surface-soft disabled:opacity-50" onClick={() => { setReasonPromptId({ id: r.id, kind: 'correction' }); setReasonInput(''); }}>
                                {L('सुधार का अनुरोध', 'Request correction')}
                              </button>
                              <button type="button" disabled={busy} className="rounded-md bg-teal-100 px-2 py-1 text-xs font-extrabold text-success hover:bg-teal-200 disabled:opacity-50" onClick={() => void act(r.id, 'publish')}>
                                {L('अनुमोदित व प्रकाशित करें', 'Approve & Publish')}
                              </button>
                            </>
                          ) : null}
                          {canCheck && r.status === 'PUBLISHED' ? (
                            <button type="button" disabled={busy} className="rounded-md border border-line px-2 py-1 text-xs font-bold hover:bg-surface-soft disabled:opacity-50" onClick={() => { setReasonPromptId({ id: r.id, kind: 'unpublish' }); setReasonInput(''); }}>
                              {L('अप्रकाशित करें', 'Unpublish')}
                            </button>
                          ) : null}
                          {canCheck && ['DRAFT', 'CORRECTION_REQUIRED', 'UNPUBLISHED'].includes(r.status) ? (
                            <button type="button" disabled={busy} className="rounded-md border border-line px-2 py-1 text-xs font-bold text-danger hover:bg-surface-soft disabled:opacity-50" onClick={() => void act(r.id, 'archive')}>
                              {L('संग्रहित करें', 'Archive')}
                            </button>
                          ) : null}
                        </div>
                        {reasonPromptId?.id === r.id ? (
                          <div className="mt-2 flex flex-col items-end gap-1.5">
                            <textarea
                              value={reasonInput}
                              onChange={(e) => setReasonInput(e.target.value)}
                              placeholder={reasonPromptId.kind === 'correction' ? L('सुधार का कारण…', 'Reason for correction…') : L('अप्रकाशित करने का कारण…', 'Reason for unpublishing…')}
                              className="h-16 w-full max-w-xs rounded-md border border-line p-2 text-xs outline-none focus:border-orange-500"
                            />
                            <div className="flex gap-1.5">
                              <button type="button" className="rounded-md border border-line px-2 py-1 text-xs font-bold hover:bg-surface-soft" onClick={() => { setReasonPromptId(null); setReasonInput(''); }}>
                                {L('रद्द करें', 'Cancel')}
                              </button>
                              <button type="button" disabled={!reasonInput.trim() || busy} className="rounded-md bg-orange-500 px-2 py-1 text-xs font-extrabold text-white hover:bg-orange-600 disabled:opacity-50" onClick={() => void submitReason()}>
                                {L('भेजें', 'Send')}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {canMake ? (
        <section className="rounded-lg border border-line bg-white p-5">
          <h3 className="mb-2 text-sm font-extrabold text-navy-900">
            {editingId ? L('आइटम संपादित करें', 'Edit item') : L('नई प्रविष्टि', 'New entry')}
          </h3>
          {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
          <form noValidate onSubmit={(e) => { e.preventDefault(); void save(); }} className="grid gap-3 sm:grid-cols-2">
            <Field label={L('दिनांक', 'Date')} name="dateFor" type="date" value={form.dateFor} error={errors.dateFor} onChange={(e) => set('dateFor', e.target.value)} />
            <div>
              <label className="mb-1 block text-xs font-bold text-muted">{L('दायरा', 'Scope')}</label>
              <select value={form.scope} onChange={(e) => set('scope', e.target.value as CurrentAffairScope)} className="w-full rounded-md border border-line px-3 py-3 text-sm">
                {SCOPES.map((s) => <option key={s.value} value={s.value}>{hi ? s.hi : s.en}</option>)}
              </select>
            </div>
            <Field label={L('शीर्षक (हिन्दी)', 'Title (Hindi)')} name="titleHi" value={form.titleHi} error={errors.titleHi} onChange={(e) => set('titleHi', e.target.value)} />
            <Field label={L('शीर्षक (English)', 'Title (English)')} name="titleEn" value={form.titleEn} error={errors.titleEn} onChange={(e) => set('titleEn', e.target.value)} />
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-extrabold text-ink">{L('विवरण (हिन्दी)', 'Body (Hindi)')}</label>
              <textarea value={form.bodyHi} onChange={(e) => set('bodyHi', e.target.value)} className="min-h-[90px] w-full rounded-md border border-line px-3 py-2 text-sm" />
              {errors.bodyHi ? <p className="mt-1 text-sm text-danger">{errors.bodyHi}</p> : null}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-extrabold text-ink">{L('विवरण (English)', 'Body (English)')}</label>
              <textarea value={form.bodyEn} onChange={(e) => set('bodyEn', e.target.value)} className="min-h-[90px] w-full rounded-md border border-line px-3 py-2 text-sm" />
              {errors.bodyEn ? <p className="mt-1 text-sm text-danger">{errors.bodyEn}</p> : null}
            </div>
            <Field label={L('श्रेणी', 'Category')} name="category" value={form.category} error={errors.category} onChange={(e) => set('category', e.target.value)} placeholder={L('जैसे: राष्ट्रीय, अर्थव्यवस्था', 'e.g. National, Economy')} />
            <Field label={L('स्रोत (वैकल्पिक)', 'Source (optional)')} name="source" value={form.source} onChange={(e) => set('source', e.target.value)} />
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" loading={busy} className="flex-1">
                {editingId ? L('सहेजें', 'Save') : L('ड्राफ्ट बनाएँ', 'Create draft')}
              </Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={cancelEdit} className="flex-1">
                  {L('रद्द करें', 'Cancel')}
                </Button>
              ) : null}
            </div>
          </form>
        </section>
      ) : null}

      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </div>
  );
}
