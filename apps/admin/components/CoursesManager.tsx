'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, ConfirmDialog, Toast } from '@rajyarank/ui';
import { apiFetch } from '@/lib/api';

export interface CourseRow {
  id: string;
  code: string;
  titleHi: string;
  titleEn: string;
  status: string;
  visibility: string;
}

export function CoursesManager({
  initial,
  locale,
}: {
  initial: CourseRow[];
  locale: 'hi' | 'en';
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const router = useRouter();

  const [rows, setRows] = useState<CourseRow[]>(initial);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [del, setDel] = useState<CourseRow | null>(null);

  async function removeCourse() {
    if (!del) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/courses/${del.id}`, { method: 'DELETE' });
      setRows((r) => r.filter((c) => c.id !== del.id));
      setToast(L('कोर्स हटाया गया।', 'Course deleted.'));
    } catch {
      setToast(L('हटाना विफल रहा।', 'Delete failed.'));
    } finally {
      setBusy(false);
      setDel(null);
      router.refresh();
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section>
        <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('कोर्स', 'Courses')} ({rows.length})</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">{L('अभी कोई कोर्स नहीं। दाईं ओर से बनाएँ।', 'No courses yet. Create one on the right.')}</p>
        ) : (
          <ul className="grid gap-2">
            {rows.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-md border border-line bg-white p-3">
                <div className="min-w-0">
                  <Link href={`/${locale}/admin/courses/studio/${c.id}`} className="font-bold text-navy-900 hover:underline">
                    {hi ? c.titleHi : c.titleEn}
                  </Link>
                  <div className="text-xs text-muted">{c.code} · {c.status} · {c.visibility}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/${locale}/admin/courses/studio/${c.id}`} className="rounded-md border border-line px-2 py-1 text-xs font-bold text-navy-900 hover:bg-surface-soft">
                    {L('प्रबंधन', 'Manage')}
                  </Link>
                  <button type="button" onClick={() => setDel(c)} className="rounded-md border border-line px-2 py-1 text-xs font-bold text-danger hover:bg-orange-100/50">
                    {L('हटाएँ', 'Delete')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('नया कोर्स', 'New course')}</h2>
        <p className="mb-3 text-xs text-muted">
          {L('कोर्स स्टूडियो टेम्पलेट, बुनियादी जानकारी, पाठ्यक्रम, कंटेंट, मूल्य निर्धारण व प्रकाशन-तैयारी को एक ही प्रवाह में जोड़ता है।', 'Course Studio walks you through template, basics, curriculum, content, pricing, and publish-readiness in one flow.')}
        </p>
        <Link href={`/${locale}/admin/courses/studio/new`}>
          <Button className="w-full text-sm">{L('+ कोर्स स्टूडियो खोलें', '+ Open Course Studio')}</Button>
        </Link>
      </section>

      <ConfirmDialog
        open={!!del}
        title={L('कोर्स हटाएँ?', 'Delete course?')}
        message={del ? (hi ? del.titleHi : del.titleEn) : ''}
        confirmLabel={L('हटाएँ', 'Delete')}
        cancelLabel={L('रद्द करें', 'Cancel')}
        tone="danger"
        busy={busy}
        onConfirm={() => void removeCourse()}
        onCancel={() => setDel(null)}
      />
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </div>
  );
}
