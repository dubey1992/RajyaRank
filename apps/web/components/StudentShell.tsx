'use client';
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogoMark } from '@rajyarank/ui';
import { apiFetch } from '@/lib/api';

type IconName = 'home' | 'book' | 'clipboard' | 'bookmark' | 'newspaper' | 'help' | 'bell' | 'user' | 'headphones' | 'search' | 'menu';

const ICONS: Record<IconName, ReactNode> = {
  home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h4" /></>,
  bookmark: <path d="M6 3h12v18l-6-4-6 4V3Z" />,
  newspaper: <><path d="M4 5h14v14H4z" /><path d="M18 8h2v11a2 2 0 0 1-2 2H6M7 9h4v4H7zM13 9h2M13 12h2M7 16h8" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.8 9a2.4 2.4 0 1 1 3.4 2.2c-.8.4-1.2.9-1.2 1.8M12 17h.01" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  headphones: <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 14h4v7H6a2 2 0 0 1-2-2v-5ZM20 14h-4v7h2a2 2 0 0 0 2-2v-5Z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
};

function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className ?? 'h-[19px] w-[19px]'} aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

interface NavItem { href: string; label: string; icon: IconName; count?: number }

export function StudentShell({
  locale,
  name,
  initials,
  target,
  notifCount,
  activeEntitlementEndsAt,
  children,
}: {
  locale: 'hi' | 'en';
  name: string;
  initials: string;
  target: string;
  notifCount?: number;
  /** ISO expiry of the student's active plan, when known. Omit when the page
   *  hasn't fetched entitlement data — the sidebar card is hidden rather than
   *  showing a guessed/fake date. Pass `null` explicitly for "no expiry known
   *  yet" (no active entitlement, or a lifetime one). */
  activeEntitlementEndsAt?: string | null;
  children: ReactNode;
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const p = (path: string) => `/${locale}${path}`;
  const active = (path: string) => pathname === p(path) || pathname.startsWith(p(path) + '/');

  const learn: NavItem[] = [
    { href: '/dashboard', label: L('डैशबोर्ड', 'Dashboard'), icon: 'home' },
    { href: '/study-plan', label: L('स्टडी प्लान', 'Study Plan'), icon: 'clipboard' },
    { href: '/my-courses', label: L('मेरे कोर्स', 'My Courses'), icon: 'book' },
    { href: '/tests', label: L('टेस्ट और अभ्यास', 'Tests & Practice'), icon: 'clipboard' },
    { href: '/revision', label: L('रिवीज़न', 'Revision'), icon: 'bookmark' },
    { href: '/current-affairs', label: L('करंट अफेयर्स', 'Current Affairs'), icon: 'newspaper' },
  ];
  const connect: NavItem[] = [
    { href: '/doubts', label: L('मेरे सवाल', 'My Doubts'), icon: 'help' },
    { href: '/notifications', label: L('सूचनाएँ', 'Notifications'), icon: 'bell', count: notifCount },
    { href: '/account', label: L('प्रोफ़ाइल व सेटिंग्स', 'Profile & Settings'), icon: 'user' },
    { href: '/support', label: L('सहायता', 'Help & Support'), icon: 'headphones' },
  ];
  const mobileNav: NavItem[] = [
    { href: '/dashboard', label: L('डैशबोर्ड', 'Dashboard'), icon: 'home' },
    { href: '/my-courses', label: L('कोर्स', 'Courses'), icon: 'book' },
    { href: '/tests', label: L('टेस्ट', 'Tests'), icon: 'clipboard' },
    { href: '/revision', label: L('रिवीज़न', 'Revision'), icon: 'bookmark' },
    { href: '/account', label: L('प्रोफ़ाइल', 'Profile'), icon: 'user' },
  ];

  async function logout() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      /* navigate regardless */
    } finally {
      window.location.assign(`/${locale}/login`);
    }
  }

  function onSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const q = (e.target as HTMLInputElement).value.trim();
      router.push(`/${locale}/search${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    }
  }

  const NavLink = ({ item }: { item: NavItem }) => (
    <Link
      href={p(item.href)}
      onClick={() => setSidebarOpen(false)}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition ${
        active(item.href) ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-[0_10px_22px_rgba(232,90,12,0.24)]' : 'text-[#bfd2de] hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon name={item.icon} />
      <span className="flex-1">{item.label}</span>
      {item.count ? <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px]">{item.count}</span> : null}
    </Link>
  );

  return (
    <div className="min-h-screen bg-surface-soft">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-[90] flex w-[272px] flex-col overflow-auto bg-navy-950 px-3.5 py-5 text-white transition-transform md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <Link href={p('/dashboard')} className="flex items-center gap-3 border-b border-white/10 px-2.5 pb-5">
          <LogoMark size={44} />
          <div>
            <div className="text-xl font-black tracking-tight">Rajya<span className="text-orange-400">Rank</span></div>
            <div className="mt-0.5 text-[10px] font-bold text-[#9fc0d4]">{L('सीखें • अभ्यास • सुधारें', 'Learn • Practise • Improve')}</div>
          </div>
        </Link>

        <div className="my-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3">
          <span className="grid h-11 w-11 flex-none place-items-center rounded-[14px] bg-gradient-to-br from-orange-500 to-orange-100 font-black text-white">{initials}</span>
          <div className="min-w-0">
            <strong className="block truncate text-[13px]">{name}</strong>
            <small className="block truncate text-[10.5px] text-[#a9c5d7]">{target}</small>
          </div>
        </div>

        <div className="px-3 pb-1.5 pt-2 text-[9.5px] font-black uppercase tracking-[0.14em] text-[#7898ad]">{L('पढ़ाई', 'Learn')}</div>
        <nav className="grid gap-1">{learn.map((it) => <NavLink key={it.href} item={it} />)}</nav>
        <div className="px-3 pb-1.5 pt-4 text-[9.5px] font-black uppercase tracking-[0.14em] text-[#7898ad]">{L('सहायता', 'Connect')}</div>
        <nav className="grid gap-1">{connect.map((it) => <NavLink key={it.href} item={it} />)}</nav>

        {activeEntitlementEndsAt !== undefined ? (
          <div className="mt-auto pt-5">
            <div className="rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-600/25 to-white/[0.07] p-4">
              <strong className="text-[13px]">{L('मेरा प्लान', 'My plan')}</strong>
              <p className="my-1.5 text-[10.5px] text-[#bcd3df]">
                {activeEntitlementEndsAt
                  ? L(
                      `एक्सेस ${new Date(activeEntitlementEndsAt).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' })} तक वैध।`,
                      `Access valid until ${new Date(activeEntitlementEndsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
                    )
                  : L('अपनी सदस्यता व प्लान प्रबंधित करें।', 'Manage your plan and entitlements.')}
              </p>
              <Link href={p('/account')} className="block w-full rounded-lg bg-white py-2 text-center text-[11px] font-black text-navy-900">{L('मेरा प्लान देखें', 'View my plan')}</Link>
            </div>
          </div>
        ) : null}
      </aside>
      {sidebarOpen ? <div className="fixed inset-0 z-[80] bg-navy-950/50 md:hidden" onClick={() => setSidebarOpen(false)} /> : null}

      {/* Main */}
      <div className="min-h-screen md:ml-[272px]">
        <header className="sticky top-0 z-[70] flex h-[74px] items-center justify-between gap-5 border-b border-line/90 bg-white/92 px-4 backdrop-blur-xl sm:px-7">
          <button type="button" onClick={() => setSidebarOpen(true)} className="grid h-[42px] w-[42px] place-items-center rounded-xl border border-line text-navy-900 md:hidden" aria-label={L('मेन्यू', 'Open navigation')}>
            <Icon name="menu" />
          </button>
          <div className="relative hidden max-w-md flex-1 sm:block">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7890a3]"><Icon name="search" className="h-[18px] w-[18px]" /></span>
            <input
              onKeyDown={onSearch}
              placeholder={L('लेसन, टेस्ट, करंट अफेयर्स खोजें…', 'Search lessons, tests, current affairs…')}
              className="h-11 w-full rounded-[14px] border border-line bg-[#f8fafc] px-11 text-sm text-ink outline-none focus:border-navy-800/40 focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-2.5">
            <LangToggle locale={locale} />
            <Link href={p('/notifications')} className="relative grid h-[42px] w-[42px] place-items-center rounded-xl border border-line text-navy-900" aria-label={L('सूचनाएँ', 'Notifications')}>
              <Icon name="bell" />
              {notifCount ? <i className="absolute right-2 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-orange-500" /> : null}
            </Link>
            <div className="relative">
              <button type="button" onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2.5 rounded-lg p-1">
                <span className="grid h-[37px] w-[37px] place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-100 text-[12px] font-black text-white">{initials}</span>
                <span className="hidden text-left sm:block">
                  <strong className="block text-[12px] text-navy-900">{name}</strong>
                  <small className="text-[10px] text-muted">{L('विद्यार्थी', 'Student')}</small>
                </span>
              </button>
              {menuOpen ? (
                <>
                  <div className="fixed inset-0 z-[95]" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-[52px] z-[100] w-56 rounded-2xl border border-line bg-white p-2 shadow-[0_18px_48px_rgba(6,29,49,0.12)]">
                    <Link href={p('/account')} className="block rounded-lg px-3 py-2.5 text-[12px] font-semibold text-[#42586a] hover:bg-surface-soft">{L('अकाउंट सेटिंग्स', 'Account settings')}</Link>
                    <Link href={p('/support')} className="block rounded-lg px-3 py-2.5 text-[12px] font-semibold text-[#42586a] hover:bg-surface-soft">{L('सहायता और सपोर्ट', 'Help & Support')}</Link>
                    <button type="button" onClick={() => void logout()} className="block w-full rounded-lg px-3 py-2.5 text-left text-[12px] font-semibold text-danger hover:bg-surface-soft">{L('साइन आउट', 'Sign out')}</button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </header>

        <main id="main-content" className="mx-auto max-w-[1540px] px-4 py-6 pb-24 sm:px-7 md:pb-8">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-[75] grid h-[70px] grid-cols-5 border-t border-line bg-white/96 px-1 py-1.5 backdrop-blur-xl md:hidden">
        {mobileNav.map((it) => (
          <Link key={it.href} href={p(it.href)} className={`grid place-items-center gap-0.5 text-[8px] font-black ${active(it.href) ? 'text-orange-600' : 'text-[#708698]'}`}>
            <Icon name={it.icon} />
            {it.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** Compact EN/हिं toggle for the topbar (writes NEXT_LOCALE, hard-navigates). */
function LangToggle({ locale }: { locale: 'hi' | 'en' }) {
  const pathname = usePathname();
  function switchTo(next: 'hi' | 'en') {
    if (next === locale) return;
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; samesite=lax`;
    void fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/auth/locale`, {
      method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ locale: next }),
    }).catch(() => undefined);
    const rest = pathname.replace(/^\/(hi|en)(?=\/|$)/, '');
    window.location.assign(`/${next}${rest || ''}`);
  }
  return (
    <div className="hidden rounded-xl border border-line bg-[#f7f9fb] p-[3px] sm:flex" role="group" aria-label="Language">
      {(['en', 'hi'] as const).map((l) => (
        <button key={l} type="button" aria-pressed={locale === l} onClick={() => switchTo(l)} className={`rounded-lg px-2 py-1.5 text-[10.5px] font-black ${locale === l ? 'bg-navy-900 text-white' : 'text-muted'}`}>
          {l === 'en' ? 'EN' : 'हिं'}
        </button>
      ))}
    </div>
  );
}
