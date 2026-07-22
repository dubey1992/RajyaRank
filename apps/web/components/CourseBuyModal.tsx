'use client';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { InstitutePriceToggle } from './InstitutePriceToggle';
import type { ProductView, CoursePricingResolved } from '@rajyarank/contracts';

/**
 * Buy-in-place modal for the All Courses list page. Reuses InstitutePriceToggle
 * (already the full toggle + institute-code-verify + BuyButton logic used on
 * the course detail page) as the modal body — no new purchase logic here.
 */
export function CourseBuyModal({
  courseId,
  courseTitle,
  publicProduct,
  orgId,
  locale,
}: {
  courseId: string;
  courseTitle: string;
  publicProduct: ProductView | null;
  orgId: string | null;
  locale: string;
}) {
  const hi = locale === 'hi';
  const [open, setOpen] = useState(false);
  const [resolved, setResolved] = useState<CoursePricingResolved | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function onOpen() {
    setOpen(true);
    if (loaded || !orgId) return;
    try {
      const r = await apiFetch<CoursePricingResolved>(`/student/courses/${courseId}/pricing`);
      setResolved(r);
    } catch {
      // Anonymous visitor or no session — institute code-entry path still works.
      setResolved(null);
    } finally {
      setLoaded(true);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void onOpen()}
        className="rounded-md bg-orange-500 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-orange-600"
      >
        {hi ? 'खरीदें' : 'Buy'}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-base font-black text-navy-900">{courseTitle}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label={hi ? 'बंद करें' : 'Close'} className="text-muted hover:text-ink">✕</button>
            </div>
            <InstitutePriceToggle
              courseId={courseId}
              locale={locale}
              publicProduct={publicProduct}
              instituteProduct={resolved?.institute ?? null}
              qualifiesForInstitute={!!resolved?.qualifiesForInstitute}
              isStudent
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
