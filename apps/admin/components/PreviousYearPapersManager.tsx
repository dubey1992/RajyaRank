'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Field } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import type { PyqPaperView, UploadIntentResponse } from '@rajyarank/contracts';

interface ExamRef {
  id: string;
  code: string;
  nameHi: string;
  nameEn: string;
}

const STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-line text-muted',
  SUBMITTED: 'bg-[#fff7d6] text-[#966700]',
  UNDER_REVIEW: 'bg-orange-100 text-warning',
  CORRECTION_REQUIRED: 'bg-orange-100 text-danger',
  APPROVED: 'bg-teal-100 text-success',
  PUBLISHED: 'bg-teal-100 text-success',
};

/** Previous-year exam papers (PDF upload) — same maker/checker pipeline as
 *  Question Bank (submit -> start-review -> approve -> publish), same
 *  per-action visibility pattern as QuestionBankBrowser's QuestionRow.
 *  Upload reuses the exact 3-step presigned-S3 flow CreateContentWizard uses
 *  for PDF lesson notes: /staff/assets/upload-intents -> direct S3 PUT ->
 *  /staff/assets/:id/complete, then POST /staff/pyq-papers with the
 *  resulting assetId. */
export function PreviousYearPapersManager({
  papers,
  locale = 'en',
  canCreate,
  canSubmit,
  canReview,
  canApprove,
  canPublish,
}: {
  papers: PyqPaperView[];
  locale?: string;
  canCreate: boolean;
  canSubmit: boolean;
  canReview: boolean;
  canApprove: boolean;
  canPublish: boolean;
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const router = useRouter();

  const [exams, setExams] = useState<ExamRef[]>([]);
  const [examId, setExamId] = useState('');
  const [titleHi, setTitleHi] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<ExamRef[]>('/admin/catalogue/exams').then(setExams).catch(() => setExams([]));
  }, []);

  async function upload() {
    if (!examId || !titleEn.trim() || !file) {
      setError(L('कृपया परीक्षा, शीर्षक और PDF फ़ाइल चुनें।', 'Please pick an exam, title, and PDF file.'));
      return;
    }
    setUploading(true);
    setError(null);
    setMsg(null);
    try {
      const intent = await apiFetch<UploadIntentResponse>('/staff/assets/upload-intents', {
        method: 'POST',
        body: JSON.stringify({ assetType: 'DOCUMENT', fileName: file.name, mimeType: file.type, sizeBytes: file.size }),
      });
      const put = await fetch(intent.uploadUrl, { method: 'PUT', headers: { 'content-type': file.type }, body: file });
      if (!put.ok) throw new Error('File upload to storage failed.');
      const completed = await apiFetch<{ id: string; status: string }>(`/staff/assets/${intent.assetId}/complete`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await apiFetch('/staff/pyq-papers', {
        method: 'POST',
        body: JSON.stringify({ examId, titleHi: titleHi.trim() || titleEn.trim(), titleEn: titleEn.trim(), year, assetId: completed.id }),
      });
      setMsg(L('पेपर अपलोड हो गया (ड्राफ़्ट)।', 'Paper uploaded (draft).'));
      setTitleHi('');
      setTitleEn('');
      setFile(null);
      router.refresh();
    } catch (e) {
      setError((e as ApiError | Error).message ?? L('अपलोड विफल रहा।', 'Upload failed.'));
    } finally {
      setUploading(false);
    }
  }

  async function runAction(id: string, path: string) {
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/staff/pyq-papers/${id}/${path}`, { method: 'POST' });
      router.refresh();
    } catch (e) {
      setError((e as ApiError).message ?? L('कार्रवाई विफल रही।', 'Action failed.'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {canCreate ? (
        <section className="max-w-xl rounded-lg border border-line bg-white p-5">
          <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('पिछले वर्ष का पेपर अपलोड करें', 'Upload previous-year paper')}</h2>
          {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}
          {msg ? <div className="mb-3"><Alert tone="success">{msg}</Alert></div> : null}

          <label className="mb-1 block text-sm font-extrabold text-ink" htmlFor="pyq-exam">{L('परीक्षा', 'Exam')}</label>
          <select id="pyq-exam" value={examId} onChange={(e) => setExamId(e.target.value)} className="mb-3 w-full rounded-md border border-line px-3 py-3 text-sm">
            <option value="">{L('परीक्षा चुनें…', 'Select exam…')}</option>
            {exams.map((ex) => <option key={ex.id} value={ex.id}>{hi ? ex.nameHi : ex.nameEn} ({ex.code})</option>)}
          </select>

          <Field label={L('शीर्षक (अंग्रेज़ी)', 'Title (English)')} name="titleEn" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
          <Field label={L('शीर्षक (हिन्दी)', 'Title (Hindi)')} name="titleHi" value={titleHi} onChange={(e) => setTitleHi(e.target.value)} />

          <label className="mb-1 mt-3 block text-sm font-extrabold text-ink" htmlFor="pyq-year">{L('वर्ष', 'Year')}</label>
          <input
            id="pyq-year"
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="mb-3 w-full rounded-md border border-line px-3 py-3 text-sm"
          />

          <label className="mb-1 block text-sm font-extrabold text-ink" htmlFor="pyq-file">{L('PDF फ़ाइल', 'PDF file')}</label>
          <input
            id="pyq-file"
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mb-4 w-full rounded-md border border-line px-3 py-2.5 text-sm"
          />

          <Button type="button" loading={uploading} onClick={() => void upload()} className="w-full">
            {L('अपलोड करें', 'Upload')}
          </Button>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('पेपर', 'Papers')} ({papers.length})</h2>
        {!canCreate && error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}
        {papers.length === 0 ? (
          <p className="text-sm text-muted">{L('अभी कोई पेपर नहीं।', 'No papers yet.')}</p>
        ) : (
          <ul className="grid gap-2">
            {papers.map((p) => {
              const showSubmit = canSubmit && (p.status === 'DRAFT' || p.status === 'CORRECTION_REQUIRED');
              const showStartReview = canReview && p.status === 'SUBMITTED';
              const showApprove = canApprove && p.status === 'UNDER_REVIEW';
              const showPublish = canPublish && p.status === 'APPROVED';
              return (
                <li key={p.id} className="rounded-md border border-line bg-surface-soft p-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-bold text-ink">{hi ? p.titleHi : p.titleEn}</span>
                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-black ${STATUS_TONE[p.status] ?? 'bg-line'}`}>{p.status}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="text-xs text-muted">{hi ? p.examNameHi : p.examNameEn} · {p.year}</span>
                    {showSubmit ? (
                      <Button type="button" variant="secondary" loading={busyId === p.id} onClick={() => void runAction(p.id, 'submit')} className="min-h-[32px] px-3 text-xs">
                        {L('समीक्षा हेतु भेजें', 'Submit for review')}
                      </Button>
                    ) : showStartReview ? (
                      <Button type="button" variant="secondary" loading={busyId === p.id} onClick={() => void runAction(p.id, 'start-review')} className="min-h-[32px] px-3 text-xs">
                        {L('समीक्षा शुरू करें', 'Start review')}
                      </Button>
                    ) : showApprove ? (
                      <Button type="button" loading={busyId === p.id} onClick={() => void runAction(p.id, 'approve')} className="min-h-[32px] px-3 text-xs">
                        {L('स्वीकृत करें', 'Approve')}
                      </Button>
                    ) : showPublish ? (
                      <Button type="button" loading={busyId === p.id} onClick={() => void runAction(p.id, 'publish')} className="min-h-[32px] px-3 text-xs">
                        {L('प्रकाशित करें', 'Publish')}
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
