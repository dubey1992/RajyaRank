'use client';
import { useEffect, useState } from 'react';

/** Floating "back to top" CTA — hidden until the visitor has scrolled well
 *  past the hero, so it doesn't compete with anything above the fold; shown
 *  once they're deep enough into the page (past the fold, heading toward the
 *  footer) that jumping back up is actually useful. */
export function BackToTopButton({ locale }: { locale: string }) {
  const hi = locale === 'hi';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 480);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label={hi ? 'ऊपर जाएं' : 'Back to top'}
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-6 right-6 z-40 grid h-12 w-12 place-items-center rounded-full bg-orange-500 text-xl font-black text-white shadow-[0_12px_28px_rgba(245,116,23,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-600 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      <span aria-hidden>↑</span>
    </button>
  );
}
