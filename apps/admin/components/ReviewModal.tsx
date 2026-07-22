'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';

interface PreviewAsset { role: string; assetType: string; status: string; url: string | null }
interface PreviewData {
  summaryHi: string | null;
  summaryEn: string | null;
  estimatedMinutes: number | null;
  assets: PreviewAsset[];
}

const ROLE_LABEL: Record<string, { hi: string; en: string }> = {
  PRIMARY_VIDEO: { hi: 'मुख्य वीडियो', en: 'Primary video' },
  PDF_NOTES: { hi: 'पीडीएफ़ नोट्स', en: 'PDF notes' },
  ATTACHMENT: { hi: 'अनुलग्नक', en: 'Attachment' },
  THUMBNAIL: { hi: 'थंबनेल', en: 'Thumbnail' },
};

/** Academic-review modal: quality checklist + comment + approve / request-correction.
 *  Mirrors the prototype's review UX. Approve is blocked until every checklist item
 *  is ticked; the backend still re-authorizes (content.approve) and enforces state. */
const CHECKS: { key: string; hi: string; en: string }[] = [
  { key: 'accuracy', hi: 'शैक्षणिक सटीकता', en: 'Academic accuracy' },
  { key: 'av', hi: 'ऑडियो-वीडियो गुणवत्ता', en: 'Audio-video quality' },
  { key: 'syllabus', hi: 'पाठ्यक्रम प्रासंगिकता', en: 'Syllabus relevance' },
  { key: 'language', hi: 'भाषा गुणवत्ता', en: 'Language quality' },
];

export function ReviewModal({
  versionId,
  title,
  locale,
  onClose,
}: {
  versionId: string;
  title: string;
  locale: 'hi' | 'en';
  onClose: () => void;
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const router = useRouter();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<'approve' | 'correction' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<PreviewData>(`/staff/content/versions/${versionId}/preview`)
      .then((d) => { if (!cancelled) setPreview(d); })
      .catch(() => {}); // preview is a courtesy here — the checklist below still works if it fails to load
    return () => { cancelled = true; };
  }, [versionId]);

  const allChecked = CHECKS.every((c) => checked[c.key]);

  function fail(e: unknown) {
    const err = e as ApiError;
    setError(
      err?.code === 'PERMISSION_DENIED'
        ? L('पहुँच अस्वीकृत — आपके पास अनुमोदन की अनुमति नहीं है।', 'Access denied — you cannot approve.')
        : err?.code === 'CONTENT_STATE_INVALID' || err?.code === 'CONFLICT'
          ? L('यह आइटम अब इस स्थिति में नहीं है — पेज रिफ़्रेश करें।', 'This item is no longer in that state — refresh the page.')
          : err?.message ?? L('क्रिया विफल रही।', 'Action failed.'),
    );
  }

  async function approve() {
    if (!allChecked) return;
    setBusy('approve');
    setError(null);
    try {
      const passed = CHECKS.map((c) => (hi ? c.hi : c.en)).join(', ');
      await apiFetch(`/staff/content/versions/${versionId}/comment`, {
        method: 'POST',
        body: JSON.stringify({ body: `${L('गुणवत्ता जाँच उत्तीर्ण', 'Quality checklist passed')}: ${passed}. ${comment}`.trim() }),
      });
      await apiFetch(`/staff/content/versions/${versionId}/approve`, { method: 'POST' });
      router.refresh();
      onClose();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  async function requestCorrection() {
    if (!comment.trim()) {
      setError(L('कृपया सुधार के लिए टिप्पणी दर्ज करें।', 'Please enter a comment describing the correction needed.'));
      return;
    }
    setBusy('correction');
    setError(null);
    try {
      await apiFetch(`/staff/content/versions/${versionId}/request-correction`, {
        method: 'POST',
        body: JSON.stringify({ body: comment.trim() }),
      });
      router.refresh();
      onClose();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4" role="dialog" aria-modal="true" aria-label={L('समीक्षा', 'Review')}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-black text-navy-900">{L('शैक्षणिक समीक्षा', 'Academic review')}</h2>
          <button type="button" onClick={onClose} aria-label={L('बंद करें', 'Close')} className="text-muted hover:text-ink">✕</button>
        </div>
        <p className="mb-2 rounded-md bg-surface-soft p-2 text-sm font-bold text-ink">{title}</p>

        {preview ? (
          <div className="mb-4 grid gap-2 rounded-md border border-line p-2">
            {(hi ? preview.summaryHi : preview.summaryEn) ? (
              <p className="text-sm text-ink">{hi ? preview.summaryHi : preview.summaryEn}</p>
            ) : null}
            {preview.assets.length === 0 ? (
              <p className="text-xs text-muted">{L('अभी कोई सामग्री जुड़ी नहीं है।', 'No assets attached yet.')}</p>
            ) : (
              <ul className="grid gap-1">
                {preview.assets.map((a, i) => (
                  <li key={i} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-ink">{hi ? ROLE_LABEL[a.role]?.hi ?? a.role : ROLE_LABEL[a.role]?.en ?? a.role}</span>
                    {a.url ? (
                      <a href={a.url} target="_blank" rel="noreferrer" className="font-extrabold text-orange-600 hover:underline">
                        {L('खोलें', 'Open')} ↗
                      </a>
                    ) : (
                      <span className="text-muted">{a.status === 'READY' ? L('कोई फ़ाइल नहीं', 'No file') : a.status}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}

        <fieldset className="mb-4">
          <legend className="mb-2 text-sm font-extrabold text-navy-900">{L('गुणवत्ता जाँच सूची', 'Quality checklist')}</legend>
          <div className="grid gap-2">
            {CHECKS.map((c) => (
              <label key={c.key} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={!!checked[c.key]}
                  onChange={(e) => setChecked((s) => ({ ...s, [c.key]: e.target.checked }))}
                />
                {hi ? c.hi : c.en}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="mb-1 block text-sm font-extrabold text-ink" htmlFor="rev-comment">
          {L('टिप्पणी', 'Comment')}
        </label>
        <textarea
          id="rev-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="mb-4 h-20 w-full rounded-md border border-line p-2 text-sm outline-none focus:border-orange-500"
          placeholder={L('सुधार के लिए टिप्पणी आवश्यक है…', 'Required when requesting a correction…')}
        />

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => void requestCorrection()} loading={busy === 'correction'} className="text-sm">
            {L('सुधार का अनुरोध', 'Request correction')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void approve()}
            loading={busy === 'approve'}
            disabled={!allChecked}
            className="text-sm"
          >
            {L('अनुमोदित करें', 'Approve')}
          </Button>
        </div>
        {!allChecked ? (
          <p className="mt-2 text-right text-xs text-muted">{L('अनुमोदन के लिए सभी जाँच आवश्यक हैं।', 'All checks required to approve.')}</p>
        ) : null}
      </div>
    </div>
  );
}
