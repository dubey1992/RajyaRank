'use client';
import { useEffect, useState } from 'react';
import { Alert } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';

interface PreviewAsset {
  role: string;
  assetType: string;
  status: string;
  url: string | null;
}

interface PreviewData {
  versionId: string;
  lessonType: string;
  freePreview: boolean;
  titleHi: string;
  titleEn: string;
  summaryHi: string | null;
  summaryEn: string | null;
  estimatedMinutes: number | null;
  difficulty: string | null;
  language: string | null;
  status: string;
  assets: PreviewAsset[];
}

const ROLE_LABEL: Record<string, { hi: string; en: string }> = {
  PRIMARY_VIDEO: { hi: 'मुख्य वीडियो', en: 'Primary video' },
  PDF_NOTES: { hi: 'पीडीएफ़ नोट्स', en: 'PDF notes' },
  ATTACHMENT: { hi: 'अनुलग्नक', en: 'Attachment' },
  THUMBNAIL: { hi: 'थंबनेल', en: 'Thumbnail' },
};

/** Read-only content preview — lets an author/reviewer/manager actually see
 *  what they're about to submit/approve/publish (summary + asset links),
 *  not just its title. Opened from a "View" action available on every card
 *  regardless of status, so it works before, during, and after review. */
export function ContentPreviewModal({ versionId, locale, onClose }: { versionId: string; locale: 'hi' | 'en'; onClose: () => void }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [data, setData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<PreviewData>(`/staff/content/versions/${versionId}/preview`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError((e as ApiError).message ?? L('लोड नहीं हो सका।', 'Could not load.')); });
    return () => { cancelled = true; };
  }, [versionId]);

  const title = data ? (hi ? data.titleHi : data.titleEn) || data.titleEn || data.titleHi : '';
  const summary = data ? (hi ? data.summaryHi : data.summaryEn) ?? (hi ? data.summaryEn : data.summaryHi) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4" role="dialog" aria-modal="true" aria-label={L('कंटेंट देखें', 'View content')}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-black text-navy-900">{L('कंटेंट देखें', 'View content')}</h2>
          <button type="button" onClick={onClose} aria-label={L('बंद करें', 'Close')} className="text-muted hover:text-ink">✕</button>
        </div>

        {error ? <Alert tone="error">{error}</Alert> : null}

        {!data && !error ? <p className="text-sm text-muted">{L('लोड हो रहा है…', 'Loading…')}</p> : null}

        {data ? (
          <div className="grid gap-3">
            <p className="rounded-md bg-surface-soft p-2 text-sm font-bold text-ink">{title}</p>
            {summary ? <p className="text-sm text-ink">{summary}</p> : null}
            <div className="flex flex-wrap gap-3 text-xs text-muted">
              <span>{data.lessonType}</span>
              {data.estimatedMinutes ? <span>{data.estimatedMinutes} {L('मिनट', 'min')}</span> : null}
              {data.difficulty ? <span>{data.difficulty}</span> : null}
              {data.language ? <span>{data.language}</span> : null}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-extrabold text-navy-900">{L('सामग्री', 'Assets')}</h3>
              {data.assets.length === 0 ? (
                <p className="text-sm text-muted">{L('अभी कोई सामग्री जुड़ी नहीं है।', 'No assets attached yet.')}</p>
              ) : (
                <ul className="grid gap-2">
                  {data.assets.map((a, i) => (
                    <li key={i} className="flex items-center justify-between rounded-md border border-line p-2 text-sm">
                      <span className="font-bold text-ink">{hi ? ROLE_LABEL[a.role]?.hi ?? a.role : ROLE_LABEL[a.role]?.en ?? a.role}</span>
                      {a.url ? (
                        <a href={a.url} target="_blank" rel="noreferrer" className="font-extrabold text-orange-600 hover:underline">
                          {L('खोलें', 'Open')} ↗
                        </a>
                      ) : (
                        <span className="text-xs text-muted">{a.status === 'READY' ? L('कोई फ़ाइल नहीं', 'No file') : a.status}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
