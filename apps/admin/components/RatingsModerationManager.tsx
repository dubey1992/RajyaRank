'use client';
import { useEffect, useState } from 'react';
import { Alert, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import type { CourseRatingQueueItem } from '@rajyarank/contracts';

export function RatingsModerationManager({ locale }: { locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  // "Needs attention" (queue) is a reactive list — reported/hidden ratings
  // only. A normal, un-reported review never shows up there, so it had no
  // admin-facing home at all; "All ratings" is that missing view.
  const [tab, setTab] = useState<'queue' | 'all'>('queue');
  const [items, setItems] = useState<CourseRatingQueueItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function load(which: 'queue' | 'all') {
    try {
      const rows = await apiFetch<CourseRatingQueueItem[]>(which === 'queue' ? '/admin/ratings/queue' : '/admin/ratings/all');
      setItems(rows);
    } catch (e) {
      setError((e as ApiError).message ?? L('लोड नहीं हो सका।', 'Could not load.'));
    }
  }

  useEffect(() => {
    void load(tab);
  }, [tab]);

  async function act(id: string, action: 'approve' | 'hide') {
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/admin/ratings/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) });
      // Hiding drops the item from whichever list is showing (queue no
      // longer needs it acted on the same way; "all" only shows VISIBLE).
      // Approving keeps it in place — on the "all" tab it was already
      // visible, so removing it would look like the review vanished.
      if (action === 'hide') {
        setItems((prev) => prev.filter((i) => i.id !== id));
      } else {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'VISIBLE', reportCount: 0 } : i)));
      }
      setToast(action === 'approve' ? L('रेटिंग स्वीकृत की गई।', 'Rating approved.') : L('रेटिंग छिपाई गई।', 'Rating hidden.'));
    } catch (e) {
      setError((e as ApiError).message ?? L('कार्रवाई विफल रही।', 'Action failed.'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {error ? <div className="mb-4"><Alert tone="error">{error}</Alert></div> : null}
      <Toast message={toast} onDismiss={() => setToast(null)} />

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('queue')}
          className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold ${tab === 'queue' ? 'bg-navy-950 text-white' : 'border border-line bg-white text-navy-900'}`}
        >
          {L('ध्यान देने योग्य', 'Needs attention')}
        </button>
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold ${tab === 'all' ? 'bg-navy-950 text-white' : 'border border-line bg-white text-navy-900'}`}
        >
          {L('सभी रेटिंग्स', 'All ratings')}
        </button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-line bg-white p-6 text-sm text-muted">
          {tab === 'queue' ? L('समीक्षा के लिए कुछ भी लंबित नहीं है।', 'Nothing pending review.') : L('अभी तक कोई रेटिंग नहीं है।', 'No ratings yet.')}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => {
            const needsAttention = r.status === 'HIDDEN' || r.reportCount > 0;
            return (
              <li key={r.id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-extrabold text-navy-900">{hi ? r.courseTitleHi : r.courseTitleEn}</span>
                    <span className="ml-2 text-xs text-muted">{r.userName} · {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  </div>
                  {needsAttention ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`rounded-full px-2 py-1 font-extrabold ${r.status === 'HIDDEN' ? 'bg-surface-soft text-muted' : 'bg-orange-100 text-orange-600'}`}>
                        {r.status === 'HIDDEN' ? L('छिपाया गया', 'Hidden') : L(`${r.reportCount} रिपोर्ट`, `${r.reportCount} report${r.reportCount === 1 ? '' : 's'}`)}
                      </span>
                    </div>
                  ) : null}
                </div>
                {r.comment ? <p className="mt-2 text-sm text-ink">{r.comment}</p> : null}
                <div className="mt-3 flex gap-2">
                  {needsAttention ? (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => void act(r.id, 'approve')}
                      className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-extrabold text-success hover:bg-surface-soft"
                    >
                      {L('स्वीकृत करें', 'Approve')}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void act(r.id, 'hide')}
                    className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-extrabold text-danger hover:bg-surface-soft"
                  >
                    {L('छिपाएँ', 'Hide')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
