'use client';
import { useState } from 'react';

/** No-login sample question — the "free demo" destination. Purely client-side. */
export function DemoQuiz({ locale }: { locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const [picked, setPicked] = useState<string | null>(null);
  const correct = 'C';
  const options: [string, string][] = hi
    ? [['A', 'भाग I'], ['B', 'भाग II'], ['C', 'भाग III'], ['D', 'भाग IV']]
    : [['A', 'Part I'], ['B', 'Part II'], ['C', 'Part III'], ['D', 'Part IV']];

  return (
    <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
      <span className="rounded-full bg-navy-100 px-2 py-1 text-xs font-extrabold text-navy-900">
        {hi ? '10 में से प्रश्न 1' : 'Question 1 of 10'}
      </span>
      <h3 className="mt-3 text-lg font-black text-navy-900">
        {hi
          ? 'भारत के संविधान में मौलिक अधिकार किस भाग में दिए गए हैं?'
          : 'In which part of the Constitution of India are Fundamental Rights provided?'}
      </h3>
      <div className="mt-4 grid gap-2">
        {options.map(([key, label]) => {
          const isPicked = picked === key;
          const state = !picked
            ? 'border-line bg-white'
            : key === correct
              ? 'border-teal-500 bg-teal-100 text-success'
              : isPicked
                ? 'border-danger bg-orange-100 text-danger'
                : 'border-line bg-white';
          return (
            <button
              key={key}
              type="button"
              onClick={() => setPicked(key)}
              className={`rounded-md border px-4 py-3 text-left font-medium text-ink ${state}`}
            >
              <span className="mr-2 font-black">{key}.</span>
              {label}
            </button>
          );
        })}
      </div>
      {picked ? (
        <p className={`mt-3 rounded-md p-3 text-sm ${picked === correct ? 'bg-teal-100 text-success' : 'bg-orange-100 text-danger'}`}>
          {picked === correct
            ? hi
              ? 'सही! मौलिक अधिकार संविधान के भाग III में दिए गए हैं।'
              : 'Correct! Fundamental Rights are in Part III of the Constitution.'
            : hi
              ? 'सही उत्तर C — भाग III है।'
              : 'The correct answer is C — Part III.'}
        </p>
      ) : null}
    </div>
  );
}
