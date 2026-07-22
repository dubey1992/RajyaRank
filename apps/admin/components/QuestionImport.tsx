'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { QUESTION_CSV_TEMPLATE, parseQuestionCsv } from '@/lib/csv';

export function QuestionImport({ locale = 'en' }: { locale?: string }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: { row: number; message: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([QUESTION_CSV_TEMPLATE], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rajyarank-questions-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(file: File) {
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const text = await file.text();
      const rows = parseQuestionCsv(text);
      const res = await apiFetch<{ imported: number; errors: { row: number; message: string }[] }>('/staff/questions/import', {
        method: 'POST',
        body: JSON.stringify({ rows }),
      });
      setResult(res);
      router.refresh();
    } catch (e) {
      const err = e as ApiError & { message?: string };
      setError(
        err?.code === 'PERMISSION_DENIED'
          ? L('पहुँच अस्वीकृत — आपके पास आयात की अनुमति नहीं है।', 'Access denied — you cannot import questions.')
          : err?.message ?? L('आयात विफल रहा।', 'Import failed.'),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-xl rounded-lg border border-line bg-white p-5">
      <h2 className="mb-1 text-lg font-extrabold text-navy-900">{L('बल्क इम्पोर्ट (CSV)', 'Bulk import (CSV)')}</h2>
      <p className="mb-3 text-sm text-muted">
        {L('टेम्पलेट डाउनलोड करें, प्रश्न भरें, फिर अपलोड करें। हर पंक्ति सर्वर-साइड सत्यापित होती है; अमान्य पंक्तियाँ रिपोर्ट की जाती हैं।', 'Download the template, fill in questions, then upload. Each row is validated server-side; invalid rows are reported.')}
      </p>
      <p className="mb-3 text-xs text-muted">
        {L('subjectId और topicId (वैकल्पिक) दोनों में UUID या उसका सटीक नाम (जैसे "Polity") काम करता है।', 'Both subjectId and topicId (optional) accept either a UUID or the exact subject/topic name (e.g. "Polity").')}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={downloadTemplate} className="text-sm">{L('टेम्पलेट डाउनलोड', 'Download template')}</Button>
        <label className="cursor-pointer rounded-md border border-line px-3 py-2 text-sm font-extrabold text-navy-900 hover:bg-surface-soft">
          {busy ? L('आयात हो रहा है…', 'Importing…') : L('CSV अपलोड करें', 'Upload CSV')}
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={busy}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      {error ? <div className="mt-3"><Alert tone="error">{error}</Alert></div> : null}
      {result ? (
        <div className="mt-3">
          <Alert tone={result.errors.length ? 'error' : 'success'}>
            {L(`${result.imported} आयात हुए`, `${result.imported} imported`)}
            {result.errors.length ? `, ${result.errors.length} ${L('विफल', 'failed')}` : ''}
          </Alert>
          {result.errors.length ? (
            <ul className="mt-2 grid gap-1 text-xs text-danger">
              {result.errors.slice(0, 10).map((er) => (
                <li key={er.row}>{L(`पंक्ति ${er.row}`, `Row ${er.row}`)}: {er.message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
