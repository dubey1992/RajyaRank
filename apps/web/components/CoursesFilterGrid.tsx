'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { CourseBuyModal } from './CourseBuyModal';
import type { FilterableCourse } from '@/lib/courses';
import type { StudentCourseSummary } from '@rajyarank/contracts';

export type { FilterableCourse } from '@/lib/courses';

interface Ref { id: string; code: string; nameHi: string; nameEn: string }

export function CoursesFilterGrid({
  courses,
  states,
  exams,
  locale,
  mode = 'browse',
  isStudent = false,
}: {
  courses: FilterableCourse[];
  states: Ref[];
  exams: Ref[];
  locale: string;
  /** 'browse' (default): whole card links to the detail page, as on the
   *  homepage teaser. 'buy': card shows a smaller "view syllabus" link plus
   *  a Buy button opening CourseBuyModal in place — used on the All Courses page. */
  mode?: 'browse' | 'buy';
  /** Shows the wishlist heart toggle on each card — hidden for anonymous
   *  visitors and staff, since wishlisting is a student-only concept. */
  isStudent?: boolean;
}) {
  const hi = locale === 'hi';
  const [wishlisted, setWishlisted] = useState<Set<string>>(new Set());
  // Courses the student already has access to — without this, a purchased
  // course still showed "Buy" here (this list has no per-student entitlement
  // data on its own), inviting a repeat purchase of something already owned.
  const [ownedCourseIds, setOwnedCourseIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isStudent) return;
    apiFetch<string[]>('/student/wishlist/course-ids')
      .then((ids) => setWishlisted(new Set(ids)))
      .catch(() => {});
    apiFetch<StudentCourseSummary[]>('/student/courses')
      .then((courses) => setOwnedCourseIds(new Set(courses.map((c) => c.courseId))))
      .catch(() => {});
  }, [isStudent]);

  async function toggleWishlist(e: React.MouseEvent, courseId: string) {
    e.preventDefault();
    e.stopPropagation();
    const wasWishlisted = wishlisted.has(courseId);
    setWishlisted((prev) => {
      const next = new Set(prev);
      if (wasWishlisted) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
    try {
      await apiFetch(`/student/courses/${courseId}/wishlist`, { method: 'POST' });
    } catch {
      // revert on failure
      setWishlisted((prev) => {
        const next = new Set(prev);
        if (wasWishlisted) next.add(courseId);
        else next.delete(courseId);
        return next;
      });
    }
  }
  const [q, setQ] = useState('');
  const [stateId, setStateId] = useState('');
  const [examId, setExamId] = useState('');
  const [audience, setAudience] = useState<'ALL' | 'PUBLIC' | 'INSTITUTE'>('ALL');
  const [sort, setSort] = useState<'NEWEST' | 'POPULAR' | 'RATED'>('NEWEST');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = courses.filter((c) => {
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
    const sorted = [...rows];
    if (sort === 'POPULAR') {
      sorted.sort((a, b) => b.enrollmentCount - a.enrollmentCount);
    } else if (sort === 'RATED') {
      // Ties (including "no ratings yet") fall back to enrollment count so
      // the list never looks arbitrarily shuffled for equally-unrated courses.
      sorted.sort((a, b) => b.avgRating - a.avgRating || b.ratingCount - a.ratingCount || b.enrollmentCount - a.enrollmentCount);
    } else {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted;
  }, [courses, q, stateId, examId, audience, sort]);

  const nameOf = (list: Ref[], id: string) => {
    const r = list.find((x) => x.id === id);
    return r ? (hi ? r.nameHi : r.nameEn) : id;
  };
  const isNew = (createdAt: string) => Date.now() - new Date(createdAt).getTime() < 14 * 24 * 60 * 60 * 1000;

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2 rounded-lg border border-line bg-white p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={hi ? 'कोर्स, परीक्षा या राज्य खोजें' : 'Search course, exam, or state'}
          className="min-w-[200px] flex-1 rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-orange-500"
        />
        <select value={examId} onChange={(e) => setExamId(e.target.value)} className="rounded-md border border-line px-3 py-2 text-sm">
          <option value="">{hi ? 'सभी परीक्षाएँ' : 'All exams'}</option>
          {exams.map((e) => <option key={e.id} value={e.id}>{hi ? e.nameHi : e.nameEn}</option>)}
        </select>
        <select value={stateId} onChange={(e) => setStateId(e.target.value)} className="rounded-md border border-line px-3 py-2 text-sm">
          <option value="">{hi ? 'सभी राज्य' : 'All states'}</option>
          {states.map((s) => <option key={s.id} value={s.id}>{hi ? s.nameHi : s.nameEn}</option>)}
        </select>
        <select value={audience} onChange={(e) => setAudience(e.target.value as 'ALL' | 'PUBLIC' | 'INSTITUTE')} className="rounded-md border border-line px-3 py-2 text-sm">
          <option value="ALL">{hi ? 'सभी एक्सेस प्रकार' : 'All access types'}</option>
          <option value="PUBLIC">{hi ? 'सार्वजनिक' : 'Public'}</option>
          <option value="INSTITUTE">{hi ? 'संस्थान' : 'Institute-affiliated'}</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as 'NEWEST' | 'POPULAR' | 'RATED')} className="rounded-md border border-line px-3 py-2 text-sm">
          <option value="NEWEST">{hi ? 'नवीनतम' : 'Newest'}</option>
          <option value="POPULAR">{hi ? 'सबसे लोकप्रिय' : 'Most popular'}</option>
          <option value="RATED">{hi ? 'उच्चतम रेटिंग' : 'Highest rated'}</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted">{hi ? 'कोई कोर्स नहीं मिला। फ़िल्टर बदलें।' : 'No courses match these filters.'}</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const heart = isStudent ? (
              <button
                type="button"
                onClick={(e) => void toggleWishlist(e, c.id)}
                aria-label={hi ? 'विशलिस्ट में जोड़ें/हटाएँ' : 'Add to/remove from wishlist'}
                aria-pressed={wishlisted.has(c.id)}
                className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-lg shadow-sm transition hover:scale-105"
              >
                <span className={wishlisted.has(c.id) ? 'text-danger' : 'text-line'}>{wishlisted.has(c.id) ? '♥' : '♡'}</span>
              </button>
            ) : null;
            const tags = (
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-surface-soft px-2 py-1 text-[10px] font-extrabold text-muted">{nameOf(exams, c.examId)}</span>
                {c.orgName ? (
                  <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-extrabold text-orange-600">{c.orgName}</span>
                ) : (
                  <span className="rounded-full bg-teal-100 px-2 py-1 text-[10px] font-extrabold text-success">{hi ? 'सार्वजनिक' : 'Public'}</span>
                )}
                {isNew(c.createdAt) ? (
                  <span className="rounded-full bg-navy-100 px-2 py-1 text-[10px] font-extrabold text-navy-800">{hi ? 'नया' : 'New'}</span>
                ) : null}
              </div>
            );
            const meta = (
              <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                <span>{nameOf(states, c.stateId)}</span>
                {c.ratingCount > 0 ? (
                  <span className="flex items-center gap-0.5 font-bold text-orange-600">★ {c.avgRating.toFixed(1)} <span className="font-normal text-muted">({c.ratingCount})</span></span>
                ) : null}
                {c.enrollmentCount > 0 ? <span>{hi ? `${c.enrollmentCount} नामांकित` : `${c.enrollmentCount} enrolled`}</span> : null}
              </div>
            );
            const priceBlock = (
              <div className="mt-auto border-t border-line pt-4">
                <div className="flex items-end gap-2">
                  {c.priceMinor === 0 ? (
                    <strong className="text-[22px] font-black text-navy-950">{hi ? 'नि:शुल्क' : 'Free'}</strong>
                  ) : (
                    <>
                      <strong className="text-[22px] font-black text-navy-950">₹{(c.priceMinor / 100).toLocaleString('en-IN')}</strong>
                      {c.originalPriceMinor && c.originalPriceMinor > c.priceMinor ? (
                        <span className="text-sm text-muted line-through">₹{(c.originalPriceMinor / 100).toLocaleString('en-IN')}</span>
                      ) : null}
                    </>
                  )}
                </div>
                <span className="mt-1.5 inline-block rounded-full bg-surface-soft px-2 py-1 text-[10px] font-extrabold text-muted">
                  {c.validityDays ? (hi ? `${c.validityDays} दिन वैधता` : `${c.validityDays} days validity`) : hi ? 'आजीवन' : 'Lifetime'}
                </span>
              </div>
            );

            if (mode === 'buy') {
              const owned = ownedCourseIds.has(c.id);
              return (
                <div key={c.id} className="relative flex flex-col rounded-lg border border-line bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                  {heart}
                  {tags}
                  <h3 className="mt-3 text-xl font-black text-navy-900">{hi ? c.titleHi : c.titleEn}</h3>
                  {meta}
                  <Link href={`/${locale}/courses/${c.id}`} className="mt-1 text-xs font-bold text-navy-700 hover:underline">
                    {hi ? 'सिलेबस देखें →' : 'View syllabus →'}
                  </Link>
                  {owned ? (
                    <div className="mt-auto border-t border-line pt-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-2.5 py-1 text-[11px] font-extrabold text-success">
                        ✓ {hi ? 'नामांकित' : 'Enrolled'}
                      </span>
                      <Link
                        href={`/${locale}/my-courses/${c.id}`}
                        className="mt-3 flex items-center justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-teal-500"
                      >
                        {hi ? 'पढ़ाई जारी रखें' : 'Continue Learning'}
                      </Link>
                    </div>
                  ) : (
                    <>
                      {priceBlock}
                      <div className="mt-3">
                        <CourseBuyModal courseId={c.id} courseTitle={hi ? c.titleHi : c.titleEn} publicProduct={c.product} orgId={c.orgId} locale={locale} />
                      </div>
                    </>
                  )}
                </div>
              );
            }

            return (
              <Link key={c.id} href={`/${locale}/courses/${c.id}`} className="relative flex flex-col rounded-lg border border-line bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-orange-400">
                {heart}
                {tags}
                <h3 className="mt-3 text-xl font-black text-navy-900">{hi ? c.titleHi : c.titleEn}</h3>
                {meta}
                {priceBlock}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
