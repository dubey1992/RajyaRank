'use client';
import { useEffect, useRef, useState } from 'react';

/** Debounced search box with a clear (✕) button. Fires `onSearch` after the
 *  user pauses typing, on Enter, and (with an empty value) on clear. */
export function SearchInput({
  placeholder,
  onSearch,
  delayMs = 350,
}: {
  placeholder: string;
  onSearch: (q: string) => void;
  delayMs?: number;
}) {
  const [value, setValue] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function schedule(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(next.trim()), delayMs);
  }
  function clear() {
    if (timer.current) clearTimeout(timer.current);
    setValue('');
    onSearch('');
  }

  return (
    <div className="relative w-full max-w-sm">
      <input
        type="search"
        role="searchbox"
        value={value}
        onChange={(e) => schedule(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (timer.current) clearTimeout(timer.current);
            onSearch(value.trim());
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-md border border-line px-3 py-2 pr-9 text-sm outline-none focus:border-orange-500"
      />
      {value ? (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-1.5 text-muted hover:bg-surface-soft hover:text-ink"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
