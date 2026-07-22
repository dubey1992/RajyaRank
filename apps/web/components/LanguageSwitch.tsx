'use client';
import { usePathname } from 'next/navigation';

/** Explicit language switch — sets NEXT_LOCALE and (if logged in) persists via API. */
export function LanguageSwitch({ locale }: { locale: 'hi' | 'en' }) {
  const pathname = usePathname();

  function switchTo(next: 'hi' | 'en') {
    if (next === locale) return;
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; samesite=lax`;
    // Persist to profile when authenticated (ignored if not).
    void fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/auth/locale`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: next }),
    }).catch(() => undefined);
    // Swap the leading locale segment and do a full navigation so the server
    // component re-renders in the new language reliably (no push/refresh race).
    const rest = pathname.replace(/^\/(hi|en)(?=\/|$)/, '');
    window.location.assign(`/${next}${rest || ''}`);
  }

  return (
    <div role="group" aria-label="Language" className="inline-flex gap-1 rounded-md border border-line p-1">
      {(['en', 'hi'] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={locale === l}
          onClick={() => switchTo(l)}
          className={`rounded px-2 py-1 text-xs font-extrabold ${locale === l ? 'bg-navy-900 text-white' : 'text-muted'}`}
        >
          {l === 'en' ? 'EN' : 'हिं'}
        </button>
      ))}
    </div>
  );
}
