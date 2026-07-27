'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export function WishlistToggle({ courseId, locale }: { courseId: string; locale: string }) {
  const hi = locale === 'hi';
  const [wishlisted, setWishlisted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<string[]>('/student/wishlist/course-ids')
      .then((ids) => setWishlisted(ids.includes(courseId)))
      .catch(() => {});
  }, [courseId]);

  async function toggle() {
    setBusy(true);
    const next = !wishlisted;
    setWishlisted(next);
    try {
      await apiFetch(`/student/courses/${courseId}/wishlist`, { method: 'POST' });
    } catch {
      setWishlisted(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      aria-pressed={wishlisted}
      className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-4 py-2 text-sm font-extrabold text-navy-900 hover:bg-surface-soft"
    >
      <span className={wishlisted ? 'text-danger' : 'text-muted'}>{wishlisted ? '♥' : '♡'}</span>
      {wishlisted ? (hi ? 'विशलिस्ट में सहेजा गया' : 'Saved to wishlist') : (hi ? 'विशलिस्ट में सहेजें' : 'Save to wishlist')}
    </button>
  );
}
