'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

export interface RowAction {
  key: string;
  label: string;
  /** Renders as a Link instead of a button when set (e.g. "View Institute"). */
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}

const PANEL_WIDTH = 190;

/** Ellipsis-triggered row action menu, reused across the row-action columns
 *  on Manage Institutions/Students/Staffs so those tables don't spill 3-4
 *  separate buttons across the row.
 *
 *  Portals the open panel to document.body instead of a plain CSS-absolute
 *  child: every one of these rows sits inside a `overflow-x-auto` table
 *  wrapper (needed for horizontal scroll on narrow screens), and setting
 *  only overflow-x also computes overflow-y as auto — a `position: absolute`
 *  panel is clipped by that ancestor no matter how correctly it's
 *  positioned, so the menu silently never appeared. A portal + `position:
 *  fixed` (viewport-relative, computed from the button's own rect) escapes
 *  that clipping entirely, the same fix any dropdown-in-a-scroll-container
 *  needs. */
export function RowActionsMenu({ actions, locale, label }: { actions: RowAction[]; locale: 'hi' | 'en'; label?: string }) {
  const hi = locale === 'hi';
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function toggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - PANEL_WIDTH),
      });
    }
    setOpen((v) => !v);
  }

  // A menu anchored to a row that's since scrolled out from under it would
  // otherwise float in place, detached from the button that opened it —
  // simplest correct behaviour is to close it, same as clicking away.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <div className="relative inline-block text-left">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label={label ?? (hi ? 'कार्रवाइयाँ' : 'Actions')}
        aria-haspopup="true"
        aria-expanded={open}
        className="grid h-8 w-8 place-items-center rounded-md border border-line text-base leading-none text-muted hover:bg-surface-soft hover:text-ink"
      >
        ⋮
      </button>
      {open && coords && typeof document !== 'undefined'
        ? createPortal(
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div
                style={{ position: 'fixed', top: coords.top, left: coords.left, width: PANEL_WIDTH }}
                className="z-50 rounded-lg border border-line bg-white p-1.5 shadow-[0_18px_48px_rgba(6,29,49,0.14)]"
              >
                {actions.map((a) =>
                  a.href ? (
                    <Link
                      key={a.key}
                      href={a.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-md px-3 py-2 text-xs font-bold text-ink hover:bg-surface-soft"
                    >
                      {a.label}
                    </Link>
                  ) : (
                    <button
                      key={a.key}
                      type="button"
                      disabled={a.disabled}
                      onClick={() => {
                        setOpen(false);
                        a.onClick?.();
                      }}
                      className={`block w-full rounded-md px-3 py-2 text-left text-xs font-bold hover:bg-surface-soft disabled:opacity-50 ${
                        a.tone === 'danger' ? 'text-danger' : 'text-ink'
                      }`}
                    >
                      {a.label}
                    </button>
                  ),
                )}
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
