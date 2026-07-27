'use client';
import { useEffect, useState } from 'react';
import { Alert, Button } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import type { CourseRatingsResponse, CourseRatingView } from '@rajyarank/contracts';

const STARS = [1, 2, 3, 4, 5] as const;

function Stars({ value, size = 'text-base' }: { value: number; size?: string }) {
  return (
    <span className={`${size} tracking-tight text-orange-500`} aria-label={`${value} / 5`}>
      {STARS.map((s) => (s <= Math.round(value) ? '★' : '☆')).join('')}
    </span>
  );
}

export function CourseRatings({ courseId, isStudent, locale }: { courseId: string; isStudent: boolean; locale: string }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  const [data, setData] = useState<CourseRatingsResponse | null>(null);
  const [canRate, setCanRate] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    apiFetch<CourseRatingsResponse>(`/courses/${courseId}/ratings`).then(setData).catch(() => {});
    if (isStudent) {
      apiFetch<{ hasAccess: boolean }>(`/student/courses/${courseId}/rating-access`)
        .then((r) => setCanRate(r.hasAccess))
        .catch(() => setCanRate(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only depends on identity of the course/viewer, not on data itself
  }, [courseId, isStudent]);

  async function onSubmit() {
    if (myRating < 1) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch<CourseRatingView>(`/courses/${courseId}/ratings`, {
        method: 'POST',
        body: JSON.stringify({ rating: myRating, comment: comment.trim() || undefined }),
      });
      const fresh = await apiFetch<CourseRatingsResponse>(`/courses/${courseId}/ratings`);
      setData(fresh);
      setSubmitted(true);
    } catch (e) {
      setError((e as ApiError).message ?? L('सबमिट नहीं हो सका।', 'Could not submit.'));
    } finally {
      setBusy(false);
    }
  }

  async function onReport(ratingId: string) {
    try {
      await apiFetch(`/courses/${courseId}/ratings/${ratingId}/report`, { method: 'POST' });
    } catch {
      // best-effort — no UI feedback needed for a report action
    }
  }

  if (!data) return null;

  return (
    <div className="mt-10 border-t border-line pt-8">
      <h2 className="text-xl font-black text-navy-950">{L('छात्र रेटिंग व टिप्पणियाँ', 'Student ratings & reviews')}</h2>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div className="flex items-baseline gap-2">
          <strong className="text-3xl font-black text-navy-950">{data.summary.count > 0 ? data.summary.average.toFixed(1) : '—'}</strong>
          <Stars value={data.summary.average} size="text-xl" />
        </div>
        <span className="text-sm text-muted">{L(`${data.summary.count} रेटिंग`, `${data.summary.count} rating${data.summary.count === 1 ? '' : 's'}`)}</span>
      </div>

      {data.summary.count > 0 ? (
        <div className="mt-3 max-w-xs space-y-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const n = data.summary.breakdown[String(star) as '1' | '2' | '3' | '4' | '5'];
            const pct = data.summary.count > 0 ? Math.round((n / data.summary.count) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs text-muted">
                <span className="w-3 text-right">{star}★</span>
                <div className="h-1.5 flex-1 rounded-full bg-surface-soft">
                  <div className="h-1.5 rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 text-right tabular-nums">{n}</span>
              </div>
            );
          })}
        </div>
      ) : null}

      {isStudent && canRate ? (
        <div className="mt-6 max-w-md rounded-lg border border-line bg-surface-soft p-4">
          {submitted ? (
            <Alert tone="success">{L('आपकी रेटिंग सबमिट हो गई है।', 'Your rating has been submitted.')}</Alert>
          ) : (
            <>
              <p className="mb-2 text-sm font-extrabold text-navy-900">{L('इस कोर्स को रेट करें', 'Rate this course')}</p>
              {error ? <div className="mb-2"><Alert tone="error">{error}</Alert></div> : null}
              <div className="mb-2 flex gap-1 text-2xl">
                {STARS.map((s) => (
                  <button key={s} type="button" onClick={() => setMyRating(s)} aria-label={`${s} star`} className={s <= myRating ? 'text-orange-500' : 'text-line'}>
                    ★
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={L('अपना अनुभव लिखें (वैकल्पिक)…', 'Share your experience (optional)…')}
                rows={3}
                className="w-full rounded-md border border-line bg-white p-2 text-sm outline-none focus:border-orange-500"
              />
              <div className="mt-2">
                <Button onClick={() => void onSubmit()} disabled={busy || myRating < 1}>
                  {busy ? L('सबमिट हो रहा है…', 'Submitting…') : L('सबमिट करें', 'Submit')}
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {data.ratings.length === 0 ? (
        <p className="mt-6 text-sm text-muted">{L('अभी तक कोई रेटिंग नहीं।', 'No ratings yet.')}</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {data.ratings.map((r) => (
            <li key={r.id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-navy-900">{r.userName}</span>
                  <Stars value={r.rating} />
                </div>
                <button type="button" onClick={() => void onReport(r.id)} className="text-xs text-muted hover:text-danger">
                  {L('रिपोर्ट करें', 'Report')}
                </button>
              </div>
              {r.comment ? <p className="mt-1.5 text-sm text-ink">{r.comment}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
