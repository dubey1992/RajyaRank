'use client';
import { useEffect, useState } from 'react';
import { Alert, Button, Field, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';
import { StatusBadge } from '@/components/WorkflowActions';
import type { ConceptView, OfficialNoticeView, UploadIntentResponse } from '@rajyarank/contracts';

interface ExamRef { id: string; code: string; nameHi: string; nameEn: string }

const EDITABLE_FROM = new Set(['DRAFT', 'CORRECTION_REQUIRED']);

const emptyForm = {
  examId: '',
  noticeNumber: '',
  publishedDate: new Date().toISOString().slice(0, 10),
  sourceUrl: '',
  sourceAssetId: '',
  titleHi: '',
  titleEn: '',
  bodyHi: '',
  bodyEn: '',
  proposedApplicationDeadline: '',
  proposedExamDate: '',
  affectedConceptIds: [] as string[],
  syllabusVersionTag: '',
};

export function OfficialNoticesManager({
  initial,
  initialExams,
  canMake,
  canCheck,
  locale,
}: {
  initial: OfficialNoticeView[];
  initialExams: ExamRef[];
  canMake: boolean;
  canCheck: boolean;
  locale: 'hi' | 'en';
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [rows, setRows] = useState<OfficialNoticeView[]>(initial);
  const [exams] = useState<ExamRef[]>(initialExams);
  const [toast, setToast] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [reasonPromptId, setReasonPromptId] = useState<{ id: string; kind: 'correction' | 'unpublish' } | null>(null);
  const [reasonInput, setReasonInput] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formConcepts, setFormConcepts] = useState<ConceptView[]>([]);

  function set<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  useEffect(() => {
    if (!form.examId) { setFormConcepts([]); return; }
    apiFetch<ConceptView[]>(`/admin/concepts?examId=${form.examId}`).then(setFormConcepts).catch(() => setFormConcepts([]));
  }, [form.examId]);

  function startEdit(row: OfficialNoticeView) {
    setEditingId(row.id);
    setForm({
      examId: row.examId,
      noticeNumber: row.noticeNumber,
      publishedDate: row.publishedDate.slice(0, 10),
      sourceUrl: row.sourceUrl ?? '',
      sourceAssetId: row.sourceAssetId ?? '',
      titleHi: row.titleHi,
      titleEn: row.titleEn,
      bodyHi: row.bodyHi,
      bodyEn: row.bodyEn,
      proposedApplicationDeadline: row.proposedApplicationDeadline?.slice(0, 10) ?? '',
      proposedExamDate: row.proposedExamDate?.slice(0, 10) ?? '',
      affectedConceptIds: row.affectedConceptIds,
      syllabusVersionTag: row.syllabusVersionTag ?? '',
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
    if (!form.examId) errs.examId = L('परीक्षा चुनें।', 'Select an exam.');
    if (!form.noticeNumber.trim()) errs.noticeNumber = L('सूचना संख्या दर्ज करें।', 'Enter a notice number.');
    if (!form.publishedDate) errs.publishedDate = L('दिनांक दर्ज करें।', 'Enter a date.');
    if (!form.titleHi.trim()) errs.titleHi = L('हिन्दी शीर्षक दर्ज करें।', 'Enter the Hindi title.');
    if (!form.titleEn.trim()) errs.titleEn = L('English शीर्षक दर्ज करें।', 'Enter the English title.');
    if (!form.bodyHi.trim()) errs.bodyHi = L('हिन्दी विवरण दर्ज करें।', 'Enter the Hindi body.');
    if (!form.bodyEn.trim()) errs.bodyEn = L('English विवरण दर्ज करें।', 'Enter the English body.');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function uploadPdf(file: File) {
    setUploading(true);
    try {
      const intent = await apiFetch<UploadIntentResponse>('/staff/assets/upload-intents', {
        method: 'POST',
        body: JSON.stringify({ assetType: 'DOCUMENT', fileName: file.name, mimeType: file.type, sizeBytes: file.size }),
      });
      const put = await fetch(intent.uploadUrl, { method: 'PUT', headers: { 'content-type': file.type }, body: file });
      if (!put.ok) throw new Error('Upload to storage failed.');
      await apiFetch(`/staff/assets/${intent.assetId}/complete`, { method: 'POST', body: JSON.stringify({}) });
      set('sourceAssetId', intent.assetId);
      setToast(L('PDF अपलोड हो गया।', 'PDF uploaded.'));
    } catch (e) {
      setToast((e as ApiError).message ?? L('अपलोड विफल रहा।', 'Upload failed.'));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!validate()) return;
    setBusy(true);
    try {
      const payload = {
        examId: form.examId,
        noticeNumber: form.noticeNumber.trim(),
        publishedDate: form.publishedDate,
        sourceUrl: form.sourceUrl.trim() || undefined,
        sourceAssetId: form.sourceAssetId || undefined,
        titleHi: form.titleHi.trim(),
        titleEn: form.titleEn.trim(),
        bodyHi: form.bodyHi.trim(),
        bodyEn: form.bodyEn.trim(),
        proposedApplicationDeadline: form.proposedApplicationDeadline || undefined,
        proposedExamDate: form.proposedExamDate || undefined,
        affectedConceptIds: form.affectedConceptIds,
        syllabusVersionTag: form.syllabusVersionTag.trim() || undefined,
      };
      if (editingId) {
        const updated = await apiFetch<OfficialNoticeView>(`/admin/official-notices/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        setRows((r) => r.map((x) => (x.id === editingId ? updated : x)));
        setToast(L('अपडेट किया गया।', 'Updated.'));
      } else {
        const created = await apiFetch<OfficialNoticeView>('/admin/official-notices', { method: 'POST', body: JSON.stringify(payload) });
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

  async function act(id: string, action: 'submit' | 'publish' | 'archive') {
    setRowBusy(id);
    try {
      const updated = await apiFetch<OfficialNoticeView>(`/admin/official-notices/${id}/${action}`, { method: 'POST' });
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
      const path = kind === 'correction' ? `/admin/official-notices/${id}/request-correction` : `/admin/official-notices/${id}/unpublish`;
      const body = kind === 'correction' ? { body: reasonInput.trim() } : { reason: reasonInput.trim() };
      const updated = await apiFetch<OfficialNoticeView>(path, { method: 'POST', body: JSON.stringify(body) });
      setRows((r) => r.map((x) => (x.id === id ? updated : x)));
      setReasonPromptId(null);
      setReasonInput('');
    } catch (e) {
      setToast((e as ApiError).message);
    } finally {
      setRowBusy(null);
    }
  }

  function toggleConcept(id: string) {
    setForm((f) => ({
      ...f,
      affectedConceptIds: f.affectedConceptIds.includes(id) ? f.affectedConceptIds.filter((x) => x !== id) : [...f.affectedConceptIds, id],
    }));
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-3 text-lg font-extrabold text-navy-900">
          {L('आधिकारिक सूचनाएँ', 'Official Notices')} ({rows.length})
        </h2>
        {rows.length === 0 ? (
          <p className="mb-4 text-sm text-muted">{L('अभी कुछ नहीं है।', 'Nothing here yet.')}</p>
        ) : (
          <div className="mb-2 overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-soft text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">{L('परीक्षा', 'Exam')}</th>
                  <th className="px-3 py-2">{L('सूचना #', 'Notice #')}</th>
                  <th className="px-3 py-2">{L('दिनांक', 'Date')}</th>
                  <th className="px-3 py-2">{L('शीर्षक', 'Title')}</th>
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
                      <td className="px-3 py-2 text-muted">{hi ? r.examNameHi : r.examNameEn}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted">{r.noticeNumber}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted">{r.publishedDate.slice(0, 10)}</td>
                      <td className="px-3 py-2 font-bold text-ink">
                        {hi ? r.titleHi : r.titleEn}
                        {r.status === 'CORRECTION_REQUIRED' && r.correctionReason ? (
                          <p className="mt-1 max-w-xs text-xs font-normal text-danger">
                            {L('सुधार टिप्पणी', 'Correction note')}: {r.correctionReason}
                          </p>
                        ) : null}
                      </td>
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
            {editingId ? L('सूचना संपादित करें', 'Edit notice') : L('नई सूचना', 'New notice')}
          </h3>
          {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
          <form noValidate onSubmit={(e) => { e.preventDefault(); void save(); }} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-muted">{L('परीक्षा', 'Exam')}</label>
              <select value={form.examId} onChange={(e) => set('examId', e.target.value)} className="w-full rounded-md border border-line px-3 py-3 text-sm">
                <option value="">{L('परीक्षा चुनें…', 'Select exam…')}</option>
                {exams.map((x) => <option key={x.id} value={x.id}>{hi ? x.nameHi : x.nameEn}</option>)}
              </select>
              {errors.examId ? <p className="mt-1 text-sm text-danger">{errors.examId}</p> : null}
            </div>
            <Field label={L('सूचना संख्या', 'Notice number')} name="noticeNumber" value={form.noticeNumber} error={errors.noticeNumber} onChange={(e) => set('noticeNumber', e.target.value)} />
            <Field label={L('प्रकाशन दिनांक', 'Published date')} name="publishedDate" type="date" value={form.publishedDate} error={errors.publishedDate} onChange={(e) => set('publishedDate', e.target.value)} />
            <Field label={L('स्रोत URL (वैकल्पिक)', 'Source URL (optional)')} name="sourceUrl" value={form.sourceUrl} onChange={(e) => set('sourceUrl', e.target.value)} />
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
            <Field label={L('प्रस्तावित आवेदन अंतिम तिथि (वैकल्पिक)', 'Proposed application deadline (optional)')} name="proposedApplicationDeadline" type="date" value={form.proposedApplicationDeadline} onChange={(e) => set('proposedApplicationDeadline', e.target.value)} />
            <Field label={L('प्रस्तावित परीक्षा तिथि (वैकल्पिक)', 'Proposed exam date (optional)')} name="proposedExamDate" type="date" value={form.proposedExamDate} onChange={(e) => set('proposedExamDate', e.target.value)} />
            <Field label={L('सिलेबस संस्करण टैग (वैकल्पिक)', 'Syllabus version tag (optional)')} name="syllabusVersionTag" value={form.syllabusVersionTag} onChange={(e) => set('syllabusVersionTag', e.target.value)} placeholder={L('जैसे: 2026-सूचना-3', 'e.g. 2026-Notice-3')} />
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-extrabold text-ink">{L('आधिकारिक PDF (वैकल्पिक)', 'Official PDF (optional)')}</label>
              <input type="file" accept="application/pdf" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadPdf(f); }} className="w-full rounded-md border border-line px-3 py-2 text-sm" />
              {form.sourceAssetId ? <p className="mt-1 text-xs text-success">{L('PDF संलग्न किया गया।', 'PDF attached.')}</p> : null}
              {uploading ? <p className="mt-1 text-xs text-muted">{L('अपलोड हो रहा है…', 'Uploading…')}</p> : null}
            </div>
            {form.examId ? (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-extrabold text-ink">{L('प्रभावित कॉन्सेप्ट (वैकल्पिक)', 'Affected concepts (optional)')}</label>
                {formConcepts.length === 0 ? (
                  <p className="text-xs text-muted">{L('इस परीक्षा के लिए कोई कॉन्सेप्ट नहीं मिला।', 'No concepts found for this exam.')}</p>
                ) : (
                  <div className="grid max-h-40 gap-1 overflow-y-auto rounded-md border border-line p-2">
                    {formConcepts.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={form.affectedConceptIds.includes(c.id)} onChange={() => toggleConcept(c.id)} />
                        {hi ? c.nameHi : c.nameEn}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
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
