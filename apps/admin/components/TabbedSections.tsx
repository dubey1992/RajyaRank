'use client';
import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';

export interface TabSection {
  key: string;
  label: string;
  content: ReactNode;
}

/** Simple client-side tab switcher for pages that merge what used to be
 *  separate routes into one. Initial tab comes from `?tab=` (so an old
 *  bookmark/redirect can land on the right one); switching tabs afterwards
 *  is local state only — no route change, no data refetch. */
export function TabbedSections({ sections }: { sections: TabSection[] }) {
  const searchParams = useSearchParams();
  const fromQuery = searchParams.get('tab');
  const initial = sections.find((s) => s.key === fromQuery)?.key ?? sections[0]?.key;
  const [active, setActive] = useState(initial);
  const activeSection = sections.find((s) => s.key === active) ?? sections[0];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5 border-b border-line">
        {sections.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setActive(s.key)}
            aria-current={active === s.key ? 'page' : undefined}
            className={`rounded-t-md px-4 py-2 text-sm font-bold transition ${
              active === s.key
                ? 'border-b-2 border-orange-500 text-navy-950'
                : 'text-muted hover:text-navy-900'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {activeSection?.content}
    </div>
  );
}
