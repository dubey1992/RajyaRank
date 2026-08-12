'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import type { PlaybackTokenResponse } from '@rajyarank/contracts';

// How often to report elapsed time back to the server while a lesson is open.
const HEARTBEAT_SECONDS = 20;

/**
 * Requests a short-lived signed URL only when the student presses play, then
 * renders the protected video/PDF. Progress + bookmark are reported to the API.
 * Paid lessons return ENTITLEMENT_REQUIRED until the student enrols.
 */
export function LessonPlayer({
  lessonId,
  lessonType,
  accessible,
  locale,
  title,
  summary,
  initialProgress,
  initialVideoPositionSeconds,
  initialBookmarked,
}: {
  lessonId: string;
  lessonType: string;
  accessible: boolean;
  locale: string;
  title: string;
  summary: string;
  initialProgress: number;
  initialVideoPositionSeconds: number;
  initialBookmarked: boolean;
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [media, setMedia] = useState<PlaybackTokenResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [percent, setPercent] = useState(initialProgress);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [done, setDone] = useState(initialProgress >= 100);
  const doneRef = useRef(done);
  doneRef.current = done;
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  // Wall-clock seconds accumulated this visit for EMBED/DOCUMENT kinds, which
  // expose no native "how far in" signal the way <video>.currentTime does.
  const engagedSecondsRef = useRef(0);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<PlaybackTokenResponse>(`/student/lessons/${lessonId}/playback-token`, { method: 'POST' });
      setMedia(res);
    } catch (e) {
      const err = e as ApiError;
      setError(err.code === 'ENTITLEMENT_REQUIRED' ? L('यह पाठ नामांकन के बाद खुलेगा।', 'This lesson unlocks after enrolment.') : err.message);
    } finally {
      setBusy(false);
    }
  }

  /** status omitted (rather than always 'IN_PROGRESS') once a lesson is
   *  already done — otherwise a later heartbeat on a revisited, completed
   *  lesson would silently downgrade it back to IN_PROGRESS server-side. */
  async function mark(status: 'IN_PROGRESS' | 'COMPLETED' | undefined, p: number | undefined, videoPositionSeconds?: number) {
    if (p != null) setPercent(p);
    if (status === 'COMPLETED') setDone(true);
    await apiFetch(`/student/lessons/${lessonId}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({ status, percentComplete: p, videoPositionSeconds }),
    }).catch(() => undefined);
  }

  // Continuous time tracking — without this, Total Study Time and Course
  // Progress only ever moved on an explicit onPlay/onEnded from a native
  // <video> element, which never fires for a YouTube EMBED or a PDF iframe
  // (both render as <iframe>, neither dispatches media events at all) — those
  // lessons silently never accumulated any study time or progress.
  useEffect(() => {
    if (!media) return;
    // The click-to-load itself is the only "started" signal an iframe gives us.
    if (media.kind !== 'VIDEO' && !doneRef.current) {
      void mark('IN_PROGRESS', Math.max(percent, 5));
    }
    engagedSecondsRef.current = 0;
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (media.kind === 'VIDEO') {
        const el = videoElRef.current;
        if (!el || el.paused) return;
        const position = Math.round(el.currentTime);
        const pct = el.duration && Number.isFinite(el.duration)
          ? Math.min(99, Math.round((el.currentTime / el.duration) * 100))
          : undefined;
        void mark(doneRef.current ? undefined : 'IN_PROGRESS', pct != null ? Math.max(percent, pct) : undefined, position);
      } else {
        engagedSecondsRef.current += HEARTBEAT_SECONDS;
        void mark(doneRef.current ? undefined : 'IN_PROGRESS', undefined, initialVideoPositionSeconds + engagedSecondsRef.current);
      }
    }, HEARTBEAT_SECONDS * 1000);
    return () => window.clearInterval(id);
    // `percent` is intentionally not a dependency — it's read for a one-off
    // max() inside the interval closure, not something the timer should
    // restart over; only a real media change should tear down and re-arm it.
  }, [media]);

  async function toggleBookmark() {
    const next = !bookmarked;
    setBookmarked(next); // optimistic
    await apiFetch(`/student/lessons/${lessonId}/bookmark`, { method: 'POST' }).catch(() => setBookmarked(!next));
  }

  const toolBtn = 'inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-line bg-white px-3.5 text-[11px] font-extrabold text-navy-900 transition hover:-translate-y-0.5';

  // The pre-click shell has no media loaded yet, so it can't switch on
  // media.kind (only known after playback-token resolves) — it has to guess
  // from the lesson's own type instead. Without this, a PDF lesson showed
  // the exact same dark 16:9 "▶ Click to play" video shell as a real video
  // lesson, which reads as "this is a video" even when nothing ever loads.
  const isDocumentType = lessonType === 'PDF';

  if (!accessible && !media) {
    return (
      <div className="rounded-[20px] border border-line bg-surface-soft p-10 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-[20px] bg-white text-2xl">🔒</div>
        <p className="mt-3 text-sm font-bold text-navy-900">{L('यह एक सशुल्क पाठ है।', 'This is a paid lesson.')}</p>
        <p className="mb-4 mt-1 text-[11px] text-muted">{L('पूरा कंटेंट अनलॉक करने के लिए नामांकन करें।', 'Enrol to unlock the full content.')}</p>
        <Link href={`/${locale}/pricing`} className="inline-flex rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-extrabold text-white">{L('कोर्स देखें', 'View course')} →</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-[18px] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}

        {/* Media shell */}
        <div className={`relative grid aspect-video place-items-center overflow-hidden rounded-[20px] text-white ${!media && isDocumentType ? 'bg-navy-900' : 'bg-[#06121d]'}`}>
          {!media ? (
            <button type="button" onClick={() => void load()} disabled={busy} className="text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/95 text-2xl text-orange-500">
                {isDocumentType ? '📄' : '▶'}
              </span>
              <h2 className="mt-3.5 text-[17px] font-black">{title}</h2>
              <p className="mt-1 text-[10px] text-[#a9c0d0]">
                {busy ? L('लोड हो रहा है…', 'Loading…') : isDocumentType ? L('पीडीएफ़ देखने के लिए दबाएँ', 'Click to view PDF') : L('चलाने के लिए दबाएँ', 'Click play to start')}
              </p>
            </button>
          ) : media.kind === 'VIDEO' ? (
            <video
              ref={videoElRef}
              controls
              className="h-full w-full bg-black"
              src={media.url}
              onPlay={() => void mark('IN_PROGRESS', Math.max(percent, 5))}
              onEnded={() => void mark('COMPLETED', 100, videoElRef.current ? Math.round(videoElRef.current.currentTime) : undefined)}
            >
              <track kind="captions" />
            </video>
          ) : media.kind === 'EMBED' ? (
            <iframe
              title={title}
              src={media.url}
              className="h-full w-full bg-black"
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              // YouTube's player validates the referring page as part of loading —
              // "no-referrer" strips that entirely and the player fails closed with
              // "Error 153: Video player configuration error" (reproduced locally;
              // YouTube's own oEmbed-generated embed snippet ships this exact
              // policy, not no-referrer). allow-popups is needed for the player's
              // "Watch on YouTube" fallback link some restricted videos show.
              referrerPolicy="strict-origin-when-cross-origin"
              allow="autoplay; encrypted-media; picture-in-picture"
            />
          ) : (
            <iframe title="PDF" src={media.url} className="h-full w-full bg-white" />
          )}
        </div>

        {/* Progress */}
        {media ? (
          <div className="mt-3">
            <div className="h-[7px] overflow-hidden rounded-full bg-[#eaf0f3]"><span className="block h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400" style={{ width: `${percent}%` }} /></div>
            <div className="mt-1 flex justify-between text-[9px] text-muted"><span>{percent}% {L('पूर्ण', 'complete')}</span>{media.watermark ? <span>{L('वॉटरमार्क', 'Watermark')}: {media.watermark}</span> : null}</div>
          </div>
        ) : null}

        {/* Detail + toolbar */}
        <div className="mt-4">
          <h1 className="text-[22px] font-black tracking-tight text-navy-950">{title}</h1>
          {summary ? <p className="mt-1 text-[12px] text-muted">{summary}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void toggleBookmark()} className={bookmarked ? 'inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-orange-100 px-3.5 text-[11px] font-extrabold text-orange-600 transition hover:-translate-y-0.5' : toolBtn}>
              🔖 {bookmarked ? L('सेव किया गया', 'Bookmarked') : L('बुकमार्क', 'Bookmark')}
            </button>
            <Link href={`/${locale}/doubts`} className={toolBtn}>❓ {L('डाउट पूछें', 'Ask doubt')}</Link>
            <button
              type="button"
              onClick={() => void mark(
                'COMPLETED',
                100,
                media?.kind === 'VIDEO' && videoElRef.current
                  ? Math.round(videoElRef.current.currentTime)
                  : media
                    ? initialVideoPositionSeconds + engagedSecondsRef.current
                    : undefined,
              )}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-teal-600 px-3.5 text-[11px] font-extrabold text-white transition hover:-translate-y-0.5"
            >
              ✓ {done ? L('पूर्ण', 'Completed') : L('पूर्ण चिह्नित करें', 'Mark completed')}
            </button>
          </div>
        </div>
      </div>

      {/* Side: key outcome / help */}
      <aside className="grid content-start gap-[16px]">
        <div className="rounded-[15px] border border-[#ffdfbd] bg-[#fffaf4] p-4 text-[11.5px] text-[#684326]">
          <strong>{L('मुख्य सीख:', 'Key learning outcome:')}</strong> {summary || L('इस पाठ को पूरा करके अवधारणा और शॉर्टकट दोनों में महारत पाएँ।', 'Master both the concept and shortcut methods by completing this lesson.')}
        </div>
        <div className="rounded-[18px] border border-line bg-white p-5">
          <h3 className="text-sm font-black text-navy-900">{L('मदद चाहिए?', 'Need help?')}</h3>
          <p className="mt-1 text-[11px] text-muted">{L('इस पाठ से जुड़ा सवाल पूछें।', 'Ask a lesson-related doubt.')}</p>
          <Link href={`/${locale}/doubts`} className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-line bg-white px-4 py-2.5 text-[11px] font-extrabold text-navy-900 transition hover:bg-surface-soft">❓ {L('डाउट पूछें', 'Ask a doubt')}</Link>
        </div>
      </aside>
    </div>
  );
}
