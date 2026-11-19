import Link from 'next/link';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { Shell, visibleNavItems, type NavItem } from '@/components/Shell';

export const dynamic = 'force-dynamic';

const CATEGORY_LABEL: Record<NavItem['category'], { hi: string; en: string }> = {
  core: { hi: 'मुख्य', en: 'Core' },
  students: { hi: 'छात्र', en: 'Students' },
  content: { hi: 'कंटेंट', en: 'Content' },
  tests: { hi: 'टेस्ट', en: 'Tests' },
  finance: { hi: 'वित्त', en: 'Finance' },
  marketing: { hi: 'मार्केटिंग', en: 'Marketing' },
  support: { hi: 'सहायता', en: 'Support' },
  platform: { hi: 'मंच प्रबंधन', en: 'Platform' },
};
const CATEGORY_ORDER: NavItem['category'][] = ['core', 'students', 'content', 'tests', 'finance', 'marketing', 'support', 'platform'];

export default async function AdminExplorePage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);

  const items = visibleNavItems(me);
  const groups = CATEGORY_ORDER
    .map((cat) => ({ cat, items: items.filter((n) => n.category === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <Shell me={me} locale={locale} title={hi ? 'सुविधाएँ खोजें' : 'Explore features'}>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        {hi
          ? 'आपकी भूमिका के अनुसार हर उपलब्ध सुविधा की सूची — हर नाम आपके बाईं ओर के नेविगेशन में भी मौजूद है।'
          : 'Every feature available to your role, in one reference list — each one also lives in the sidebar on the left.'}
      </p>
      <div className="grid gap-6">
        {groups.map((g) => (
          <section key={g.cat}>
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-muted">{hi ? CATEGORY_LABEL[g.cat].hi : CATEGORY_LABEL[g.cat].en}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((n) => (
                <Link
                  key={n.href}
                  href={`/${locale}${n.href}`}
                  className="rounded-lg border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-orange-500"
                >
                  <h3 className="text-sm font-extrabold text-navy-900">{hi ? n.label.hi : n.label.en}</h3>
                  <p className="mt-1 text-xs text-muted">{hi ? n.description.hi : n.description.en}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Shell>
  );
}
