'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const DISMISS_KEY = 'rr_hide_getting_started';

interface Step { done: boolean; href: string; labelHi: string; labelEn: string }

/**
 * First-time feature-discovery checklist — the gap a live walkthrough
 * surfaced: a brand-new student (especially one with no institute) lands on
 * a dashboard with mostly-zero stats and a ~10-item nav, with nothing
 * explaining what to do first. Auto-hides permanently once every step is
 * genuinely done (recomputed fresh each load, not a stored "seen" flag) —
 * a student can also dismiss it early via localStorage, per-device, same
 * browser-storage convention used elsewhere for per-viewer conveniences.
 */
export function GettingStartedChecklist({
  hasGoal,
  hasTopic,
  hasCompletedTask,
  hasQuiz,
  hasPaper,
  locale,
}: {
  hasGoal: boolean;
  hasTopic: boolean;
  hasCompletedTask: boolean;
  hasQuiz: boolean;
  hasPaper: boolean;
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
    { done: hasGoal, href: `/${locale}/study-plan`, labelHi: 'अपना लक्ष्य सेट करें', labelEn: 'Set your study goal' },
    { done: hasTopic, href: `/${locale}/study-plan`, labelHi: 'अपना पहला विषय जोड़ें', labelEn: 'Add your first topic' },
    { done: hasCompletedTask, href: `/${locale}/study-plan`, labelHi: 'अपना पहला काम पूरा करें', labelEn: 'Complete your first task' },
    { done: hasQuiz, href: `/${locale}/my-quizzes`, labelHi: 'एक प्रैक्टिस टेस्ट आज़माएँ', labelEn: 'Try a practice test' },
    { done: hasPaper, href: `/${locale}/my-papers`, labelHi: 'पिछले वर्ष के पेपर देखें', labelEn: 'Explore Previous Year Papers' },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  if (doneCount === steps.length || dismissed) return null;

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* best-effort only */ }
    setDismissed(true);
  }

  return (
    <article className="rounded-[20px] border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-black tracking-tight text-navy-950">{L('शुरुआत करें', 'Getting started')}</h2>
          <p className="mt-0.5 text-[11px] text-muted">{L(`${doneCount}/${steps.length} पूरा`, `${doneCount}/${steps.length} done`)}</p>
        </div>
        <button type="button" onClick={dismiss} aria-label={L('छिपाएँ', 'Hide')} className="rounded-md px-2 py-1 text-xs font-bold text-muted hover:bg-white">✕</button>
      </div>
      <div className="grid gap-2">
        {steps.map((s, i) => (
          <Link
            key={i}
            href={s.href}
            className={`flex items-center gap-3 rounded-xl border p-2.5 transition ${s.done ? 'border-teal-200 bg-teal-50/60' : 'border-line bg-white hover:-translate-y-0.5'}`}
          >
            <span className={`grid h-6 w-6 flex-none place-items-center rounded-full text-[11px] font-black ${s.done ? 'bg-teal-500 text-white' : 'border border-line text-muted'}`}>
              {s.done ? '✓' : i + 1}
            </span>
            <span className={`text-[12.5px] font-bold ${s.done ? 'text-teal-700 line-through' : 'text-ink'}`}>{L(s.labelHi, s.labelEn)}</span>
          </Link>
        ))}
      </div>
    </article>
  );
}
