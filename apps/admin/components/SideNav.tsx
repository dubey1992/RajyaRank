'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavLink {
  href: string;
  label: string;
}

/** Sidebar nav with active-route highlighting. A link is active when the
 *  current path equals it or is nested under it (e.g. /admin/staff/:id → Staff). */
export function SideNav({ items, locale }: { items: NavLink[]; locale: string }) {
  const pathname = usePathname();
  return (
    <nav className="grid gap-1">
      {items.map((n) => {
        const full = `/${locale}${n.href}`;
        const active = pathname === full || pathname.startsWith(`${full}/`);
        return (
          <Link
            key={n.href}
            href={full}
            aria-current={active ? 'page' : undefined}
            className={`rounded-md px-3 py-2 text-sm font-bold transition ${
              active ? 'bg-orange-500 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
