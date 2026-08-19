'use client';
import { useState } from 'react';
import { apiFetch, type ApiError } from '@/lib/api';
import type { PyqPaperDownload } from '@rajyarank/contracts';

/** Fetches a fresh short-lived presigned URL on click and opens it in a new
 *  tab — the browser's own PDF viewer covers both "view" and "download"
 *  (its own save control), so no custom PDF viewer is needed. Never caches
 *  the URL: same convention as the lesson PDF player, a fresh signed URL is
 *  requested every time rather than reusing a stale one. */
export function PyqDownloadButton({ id, locale = 'en' }: { id: string; locale?: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await apiFetch<PyqPaperDownload>(`/student/pyq-papers/${id}/download`);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError((e as ApiError).message ?? L('खोलने में विफल रहा।', 'Failed to open.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void open()}
        disabled={busy}
        className="block w-full rounded-xl bg-orange-500 py-2.5 text-center text-[11px] font-extrabold text-white transition hover:bg-orange-600 disabled:opacity-60"
      >
        {busy ? L('खोल रहे हैं…', 'Opening…') : L('देखें / डाउनलोड करें', 'View / Download')}
      </button>
      {error ? <p className="mt-1.5 text-[10px] text-danger" role="alert">{error}</p> : null}
    </div>
  );
}
