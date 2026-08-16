'use client';
import { useState } from 'react';
import { Button } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';

/** "How it works?" CTA for the course-creation flow: opens a modal playing a
 *  pre-recorded walkthrough (record → curriculum → content → pricing →
 *  publish). The video lives in the private S3 bucket, not a public URL — we
 *  fetch a fresh presigned GET each time the modal opens rather than caching
 *  it, since a stale presigned URL would just 403 after it expires. */
export function CourseHowItWorksButton({ locale, className }: { locale: 'hi' | 'en'; className?: string }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function show() {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ url: string }>('/admin/courses/how-it-works-video');
      setUrl(res.url);
    } catch (e) {
      setError((e as ApiError).message ?? L('वीडियो लोड नहीं हो सका।', 'Could not load the video.'));
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
    setUrl(null);
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => void show()} className={className ?? 'w-full text-sm'}>
        ▶ {L('यह कैसे काम करता है?', 'How it works?')}
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={L('कोर्स कैसे बनाएँ व प्रकाशित करें', 'How to create & publish a course')}
        >
          <div className="w-full max-w-2xl rounded-lg bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-base font-black text-navy-900">{L('कोर्स कैसे बनाएँ व प्रकाशित करें', 'How to create & publish a course')}</h2>
              <button type="button" onClick={close} aria-label={L('बंद करें', 'Close')} className="text-muted hover:text-ink">✕</button>
            </div>
            <div className="grid aspect-video place-items-center overflow-hidden rounded-md bg-navy-950">
              {loading ? (
                <p className="text-sm text-white/70">{L('लोड हो रहा है…', 'Loading…')}</p>
              ) : error ? (
                <p className="px-4 text-center text-sm text-orange-300">{error}</p>
              ) : url ? (
                <video src={url} controls autoPlay className="h-full w-full">
                  <track kind="captions" />
                </video>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
