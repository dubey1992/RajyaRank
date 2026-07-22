'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CourseBuyModal } from './CourseBuyModal';
import type { FilterableCourse } from '@/lib/courses';

export type { FilterableCourse } from '@/lib/courses';

interface Ref { id: string; code: string; nameHi: string; nameEn: string }

export function CoursesFilterGrid({
  courses,
  states,
  exams,
  locale,
  mode = 'browse',
}: {
  courses: FilterableCourse[];
  states: Ref[];
  exams: Ref[];
  locale: string;
  /** 'browse' (default): whole card links to the detail page, as on the
   *  homepage teaser. 'buy': card shows a smaller "view syllabus" link plus
   *  a Buy button opening CourseBuyModal in place — used on the All Courses page. */
  mode?: 'browse' | 'buy';
}) {
  const hi = locale === 'hi';
  const [q, setQ] = useState('');
  const [stateId, setStateId] = useState('');
  const [examId, setExamId] = useState('');
  const [audience, setAudience] = useState<'ALL' | 'PUBLIC' | 'INSTITUTE'>('ALL');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return courses.filter((c) => {
      if (needle) {
        const hay = `${c.code} ${c.titleHi} ${c.titleEn}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (stateId && c.stateId !== stateId) return false;
      if (examId && c.examId !== examId) return false;
      if (audience === 'PUBLIC' && c.orgId) return false;
      if (audience === 'INSTITUTE' && !c.orgId) return false;
      return true;
    });
  }, [courses, q, stateId, examId, audience]);

  const nameOf = (list: Ref[], id: string) => {
    const r = list.find((x) => x.id === id);
    return r ? (hi ? r.nameHi : r.nameEn) : id;
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2 rounded-lg border border-line bg-white p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={hi ? 'कोर्स, परीक्षा या राज्य खोजें' : 'Search course, exam, or state'}
          className="min-w-[200px] flex-1 rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-orange-500"
        />
        <select value={stateId} onChange={(e) => setStateId(e.target.value)} className="rounded-md border border-line px-3 py-2 text-sm">
          <option value="">{hi ? 'सभी राज्य' : 'All states'}</option>
          {states.map((s) => <option key={s.id} value={s.id}>{hi ? s.nameHi : s.nameEn}</option>)}
        </select>
        <select value={examId} onChange={(e) => setExamId(e.target.value)} className="rounded-md border border-line px-3 py-2 text-sm">
          <option value="">{hi ? 'सभी परीक्षाएँ' : 'All exams'}</option>
          {exams.map((e) => <option key={e.id} value={e.id}>{hi ? e.nameHi : e.nameEn}</option>)}
        </select>
        <select value={audience} onChange={(e) => setAudience(e.target.value as 'ALL' | 'PUBLIC' | 'INSTITUTE')} className="rounded-md border border-line px-3 py-2 text-sm">
          <option value="ALL">{hi ? 'सभी एक्सेस प्रकार' : 'All access types'}</option>
          <option value="PUBLIC">{hi ? 'सार्वजनिक' : 'Public'}</option>
          <option value="INSTITUTE">{hi ? 'संस्थान' : 'Institute-affiliated'}</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted">{hi ? 'कोई कोर्स नहीं मिला। फ़िल्टर बदलें।' : 'No courses match these filters.'}</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const tags = (
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-surface-soft px-2 py-1 text-[10px] font-extrabold text-muted">{nameOf(exams, c.examId)}</span>
                {c.orgId ? (
                  <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-extrabold text-orange-600">{hi ? 'सार्वजनिक + संस्थान' : 'Public + Institute'}</span>
                ) : (
                  <span className="rounded-full bg-teal-100 px-2 py-1 text-[10px] font-extrabold text-success">{hi ? 'सार्वजनिक' : 'Public'}</span>
                )}
              </div>
            );
            const priceBlock = (
              <div className="mt-auto border-t border-line pt-4">
                <div className="flex items-end gap-2">
                  <strong className="text-[22px] font-black text-navy-950">₹{(c.priceMinor / 100).toLocaleString('en-IN')}</strong>
                  {c.originalPriceMinor && c.originalPriceMinor > c.priceMinor ? (
                    <span className="text-sm text-muted line-through">₹{(c.originalPriceMinor / 100).toLocaleString('en-IN')}</span>
                  ) : null}
                </div>
                <small className="block text-muted">{c.validityDays ? (hi ? `${c.validityDays} दिन वैधता` : `${c.validityDays} days validity`) : hi ? 'आजीवन' : 'Lifetime'}</small>
              </div>
            );

            if (mode === 'buy') {
              return (
                <div key={c.id} className="flex flex-col rounded-lg border border-line bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                  {tags}
                  <h3 className="mt-3 text-xl font-black text-navy-900">{hi ? c.titleHi : c.titleEn}</h3>
                  <div className="mt-1 text-xs text-muted">{nameOf(states, c.stateId)}</div>
                  <Link href={`/${locale}/courses/${c.id}`} className="mt-1 text-xs font-bold text-navy-700 hover:underline">
                    {hi ? 'सिलेबस देखें →' : 'View syllabus →'}
                  </Link>
                  {priceBlock}
                  <div className="mt-3">
                    <CourseBuyModal courseId={c.id} courseTitle={hi ? c.titleHi : c.titleEn} publicProduct={c.product} orgId={c.orgId} locale={locale} />
                  </div>
                </div>
              );
            }

            return (
              <Link key={c.id} href={`/${locale}/courses/${c.id}`} className="flex flex-col rounded-lg border border-line bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-orange-400">
                {tags}
                <h3 className="mt-3 text-xl font-black text-navy-900">{hi ? c.titleHi : c.titleEn}</h3>
                <div className="mt-1 text-xs text-muted">{nameOf(states, c.stateId)}</div>
                {priceBlock}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
