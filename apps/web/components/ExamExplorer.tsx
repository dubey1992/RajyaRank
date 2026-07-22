'use client';
import { useState } from 'react';
import Link from 'next/link';

export interface StateRef { id: string; code: string; nameEn: string; nameHi: string }
export interface ExamRef { id: string; code: string; nameEn: string; nameHi: string; stateId: string | null }

/** Interactive explore-exams grid with a state filter (matches the prototype's
 *  exam-selector panel). Data comes from the public catalogue API. */
export function ExamExplorer({ states, exams, locale }: { states: StateRef[]; exams: ExamRef[]; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const nm = (o: { nameHi: string; nameEn: string }) => (hi ? o.nameHi : o.nameEn);
  const [stateId, setStateId] = useState('');

  const filtered = stateId ? exams.filter((e) => e.stateId === stateId) : exams;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <label htmlFor="state" className="text-sm font-extrabold text-navy-900">{L('राज्य', 'State')}:</label>
        <select
          id="state"
          value={stateId}
          onChange={(e) => setStateId(e.target.value)}
          className="rounded-md border border-line px-3 py-2 text-sm"
        >
          <option value="">{L('सभी राज्य', 'All states')}</option>
          {states.map((s) => <option key={s.id} value={s.id}>{nm(s)}</option>)}
        </select>
        <span className="text-sm text-muted">{filtered.length} {L('परीक्षाएँ', 'exams')}</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">{L('इस चयन के लिए कोई परीक्षा नहीं मिली।', 'No exams found for this selection.')}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => {
            const state = states.find((s) => s.id === e.stateId);
            return (
              <Link
                key={e.id}
                href={`/${locale}/exams/${e.id}`}
                className="rounded-lg border border-line bg-white p-5 shadow-sm transition hover:border-orange-500 hover:shadow-md"
              >
                <div className="mb-1 text-xs font-extrabold uppercase text-orange-600">{e.code}</div>
                <div className="text-lg font-black text-navy-900">{nm(e)}</div>
                {state ? <div className="mt-1 text-sm text-muted">{nm(state)}</div> : null}
                <div className="mt-3 text-sm font-extrabold text-navy-900">{L('कोर्स देखें →', 'View courses →')}</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
