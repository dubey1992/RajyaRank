'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const DISMISS_KEY = 'rr_admin_hide_getting_started';

interface Step { done: boolean; href: string; labelHi: string; labelEn: string }

/**
 * First-time feature-discovery checklist for a newly onboarded institution —
 * the admin-side mirror of the student dashboard's GettingStartedChecklist.
 * A fresh Academic Head lands on a dashboard that's almost entirely
 * zero-valued (no courses, no staff beyond themself) with a dense,
 * permission-gated nav, and nothing walks them through what to set up
 * first. Auto-hides permanently once every step is genuinely done
 * (recomputed fresh each load, not a stored "seen" flag) — can also be
 * dismissed early via localStorage, per-device, same convention as the
 * student-side checklist.
 */
export function GettingStartedChecklist({
  hasCourse,
  hasLesson,
  hasStaff,
  hasStudent,
  hasPublishedTest,
  studentsHref,
  testsHref,
  locale,
}: {
  hasCourse: boolean;
  hasLesson: boolean;
  hasStaff: boolean;
  hasStudent: boolean;
  hasPublishedTest: boolean;
  studentsHref: string;
  testsHref: string;
  locale: 'hi' | 'en';
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [dismissed, setDismissed] = useState(true); // default hidden until the effect confirms it isn't dismissed, avoids a flash on load

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  const steps: Step[] = [
    { done: hasCourse, href: `/${locale}/admin/courses`, labelHi: 'अपना पहला कोर्स बनाएँ', labelEn: 'Create your first course' },
    { done: hasLesson, href: `/${locale}/admin/courses`, labelHi: 'अपना पहला पाठ प्रकाशित करें', labelEn: 'Publish your first lesson' },
    { done: hasStaff, href: `/${locale}/admin/staff`, labelHi: 'अपनी टीम को आमंत्रित करें', labelEn: 'Invite your team' },
    { done: hasStudent, href: `/${locale}${studentsHref}`, labelHi: 'अपना पहला छात्र नामांकित करें', labelEn: 'Enrol your first student' },
    { done: hasPublishedTest, href: `/${locale}${testsHref}`, labelHi: 'अपना पहला टेस्ट प्रकाशित करें', labelEn: 'Publish your first test' },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  if (doneCount === steps.length || dismissed) return null;

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* best-effort only */ }
    setDismissed(true);
  }

  return (
    <section className="mb-6 rounded-lg border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black tracking-tight text-navy-950">{L('शुरुआत करें', 'Getting started')}</h2>
          <p className="mt-0.5 text-xs text-muted">{L(`${doneCount}/${steps.length} पूरा`, `${doneCount}/${steps.length} done`)}</p>
        </div>
        <button type="button" onClick={dismiss} aria-label={L('छिपाएँ', 'Hide')} className="rounded-md px-2 py-1 text-xs font-bold text-muted hover:bg-white">✕</button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((s, i) => (
          <Link
            key={i}
            href={s.href}
            className={`flex items-center gap-2.5 rounded-md border p-2.5 transition ${s.done ? 'border-teal-200 bg-teal-50/60' : 'border-line bg-white hover:border-orange-500'}`}
          >
            <span className={`grid h-6 w-6 flex-none place-items-center rounded-full text-[11px] font-black ${s.done ? 'bg-teal-500 text-white' : 'border border-line text-muted'}`}>
              {s.done ? '✓' : i + 1}
            </span>
            <span className={`text-xs font-bold ${s.done ? 'text-teal-700 line-through' : 'text-ink'}`}>{L(s.labelHi, s.labelEn)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
