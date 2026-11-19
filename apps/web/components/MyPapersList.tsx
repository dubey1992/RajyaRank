'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@rajyarank/ui';
import type { StudentPaperView, UploadIntentResponse } from '@rajyarank/contracts';
import { apiFetch, type ApiError } from '@/lib/api';

const inputCls = 'mb-3 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-500';
const MAX_BYTES = 100 * 1024 * 1024;

export function MyPapersList({ initial, locale }: { initial: StudentPaperView[]; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [papers, setPapers] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [questionCount, setQuestionCount] = useState('');
  const [answerKeyText, setAnswerKeyText] = useState('');
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadAndCreate() {
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) return setError(L('कृपया एक PDF चुनें।', 'Please choose a PDF.'));
    if (!title.trim()) return setError(L('कृपया शीर्षक दर्ज करें।', 'Please enter a title.'));
    if (file.type !== 'application/pdf') return setError(L('केवल PDF फ़ाइलें समर्थित हैं।', 'Only PDF files are supported.'));
    if (file.size > MAX_BYTES) return setError(L('फ़ाइल बहुत बड़ी है (अधिकतम 100MB)।', 'File is too large (max 100MB).'));

    setBusy(true);
    try {
      setProgress(L('अपलोड की तैयारी…', 'Preparing upload…'));
      const intent = await apiFetch<UploadIntentResponse>('/student/my-papers/upload-intents', {
        method: 'POST',
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, sizeBytes: file.size }),
      });

      setProgress(L('अपलोड हो रहा है…', 'Uploading…'));
      const put = await fetch(intent.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!put.ok) throw new Error(L('अपलोड विफल रहा।', 'Upload failed.'));

      setProgress(L('पूरा किया जा रहा है…', 'Finalizing…'));
      await apiFetch(`/student/my-papers/assets/${intent.assetId}/complete`, { method: 'POST', body: JSON.stringify({}) });

      const created = await apiFetch<StudentPaperView>('/student/my-papers', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          assetId: intent.assetId,
          year: year ? Number(year) : undefined,
          questionCount: questionCount ? Number(questionCount) : undefined,
          answerKeyText: answerKeyText.trim() || undefined,
        }),
      });
      setPapers((prev) => [created, ...prev]);
      setTitle(''); setYear(''); setQuestionCount(''); setAnswerKeyText('');
      if (fileRef.current) fileRef.current.value = '';
      setUploading(false);
    } catch (e) {
      setError((e as ApiError).message ?? (e as Error).message);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function removePaper(id: string) {
    if (!confirm(L('यह पेपर हटाएँ?', 'Remove this paper?'))) return;
    await apiFetch(`/student/my-papers/${id}`, { method: 'DELETE' }).catch((e) => alert((e as ApiError).message));
    setPapers((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-[15px] border border-line bg-white p-4">
        {uploading ? (
          <div>
            <h2 className="mb-3 text-sm font-black text-navy-950">{L('पेपर अपलोड करें', 'Upload a paper')}</h2>
            <input ref={fileRef} type="file" accept="application/pdf" className={inputCls} />
            <input className={inputCls} placeholder={L('शीर्षक, जैसे: BPSC 2023 प्रारंभिक पेपर', 'Title, e.g. BPSC 2023 Prelims Paper')} value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="mb-3 grid grid-cols-2 gap-2">
              <input type="number" className="rounded-md border border-line bg-white px-3 py-2.5 text-sm" placeholder={L('वर्ष (वैकल्पिक)', 'Year (optional)')} value={year} onChange={(e) => setYear(e.target.value)} />
              <input type="number" className="rounded-md border border-line bg-white px-3 py-2.5 text-sm" placeholder={L('कुल सवाल (वैकल्पिक)', 'Question count (optional)')} value={questionCount} onChange={(e) => setQuestionCount(e.target.value)} />
            </div>
            <label className="mb-1 block text-xs font-extrabold text-ink">{L('उत्तर कुंजी (वैकल्पिक)', 'Answer key (optional)')}</label>
            <textarea
              className={`${inputCls} h-20`}
              placeholder={L('जैसे: 1:A, 2:C, 3:B', 'e.g. 1:A, 2:C, 3:B')}
              value={answerKeyText}
              onChange={(e) => setAnswerKeyText(e.target.value)}
            />
            <p className="-mt-2 mb-3 text-[10.5px] text-muted">
              {L('बिना उत्तर कुंजी के भी आप टाइम देकर अभ्यास कर सकते हैं — बस स्कोर अपने आप नहीं बनेगा।', "Without an answer key you can still practice timed — it just won't auto-score.")}
            </p>
            {progress ? <p className="mb-2 text-xs font-bold text-orange-600">{progress}</p> : null}
            {error ? <p className="mb-2 text-xs font-bold text-danger">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="button" loading={busy} onClick={() => void uploadAndCreate()}>{L('अपलोड करें', 'Upload')}</Button>
              <button type="button" onClick={() => setUploading(false)} className="rounded-md px-3 py-2 text-xs font-bold text-muted hover:bg-surface-soft">{L('रद्द करें', 'Cancel')}</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setUploading(true)} className="rounded-md bg-orange-500 px-3 py-2 text-xs font-bold text-white hover:bg-orange-600">
            + {L('पेपर अपलोड करें', 'Upload a paper')}
          </button>
        )}
      </div>

      {papers.length === 0 && !uploading ? (
        <p className="rounded-xl border border-line bg-white p-6 text-center text-sm text-muted">
          {L('अभी तक कोई पेपर अपलोड नहीं हुआ।', 'No papers uploaded yet.')}
        </p>
      ) : (
        <div className="grid gap-2.5">
          {papers.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-[15px] border border-line bg-white p-4">
              <Link href={`/${locale}/my-papers/${p.id}`} className="min-w-0 flex-1 hover:opacity-80">
                <div className="flex items-center gap-2">
                  {p.year ? <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[9px] font-black text-muted">{p.year}</span> : null}
                  {p.hasAnswerKey ? <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[9px] font-black text-teal-600">{L('उत्तर कुंजी है', 'Has answer key')}</span> : null}
                  {p.bestScore !== null ? <span className="rounded-full bg-[#f1e9ff] px-2 py-0.5 text-[9px] font-black text-[#7c3aed]">{Math.round(p.bestScore)}%</span> : null}
                </div>
                <div className="mt-1 truncate text-[14px] font-extrabold text-ink">{p.title}</div>
                {p.questionCount ? <div className="mt-0.5 text-[10.5px] text-muted">{p.questionCount} {L('सवाल', 'questions')}</div> : null}
              </Link>
              <button type="button" onClick={() => void removePaper(p.id)} className="shrink-0 rounded-md px-2 py-1 text-[10px] font-bold text-muted hover:bg-surface-soft">
                {L('हटाएँ', 'Remove')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
