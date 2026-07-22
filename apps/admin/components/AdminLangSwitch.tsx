'use client';
import { usePathname } from 'next/navigation';

/** In-app EN/हिं toggle for the staff portal. Writes the NEXT_LOCALE cookie the
 *  middleware reads, persists the choice to the user's account (same endpoint
 *  the student app's LangToggle already uses, so it survives across devices/
 *  sessions instead of being cookie-only), then hard-navigates to the same
 *  path under the other locale (avoids the router-cache race). */
export function AdminLangSwitch({ locale }: { locale: 'hi' | 'en' }) {
  const pathname = usePathname();
  const next = locale === 'hi' ? 'en' : 'hi';

  function switchTo() {
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; samesite=lax`;
    void fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/auth/locale`, {
      method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ locale: next }),
    }).catch(() => undefined);
    const rest = pathname.replace(/^\/(hi|en)(?=\/|$)/, '');
    window.location.assign(`/${next}${rest || ''}`);
  }

  return (
    <button
      type="button"
      onClick={switchTo}
      aria-label={locale === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'}
      className="rounded-md border border-line px-2 py-1 text-xs font-extrabold text-ink hover:bg-surface-soft"
    >
      <span className={locale === 'en' ? 'text-orange-600' : 'text-muted'}>EN</span>
      <span className="mx-1 text-line">|</span>
      <span className={locale === 'hi' ? 'text-orange-600' : 'text-muted'}>हिं</span>
    </button>
  );
}
