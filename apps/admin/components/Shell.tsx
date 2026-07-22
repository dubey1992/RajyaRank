import type { ReactNode } from 'react';
import { LogoMark } from '@rajyarank/ui';
import type { MeResponse } from '@rajyarank/contracts';
import type { Locale } from '@/lib/i18n';
import { can } from '@/lib/permissions';
import { AdminLangSwitch } from './AdminLangSwitch';
import { ProfileMenu } from './ProfileMenu';
import { SideNav } from './SideNav';

interface NavItem {
  href: string;
  label: { hi: string; en: string };
  show: (me: MeResponse) => boolean;
}

// Merged nav entries are permission-driven, not role-driven — ANY role that
// would otherwise see both halves of a pair (Academic Head, Content Admin, or
// any future role granted the same permissions via the Permission Matrix)
// gets the single merged item instead of two separate ones.
export const showsMergedStudents = (me: MeResponse) => can(me, 'user.manage') && can(me, 'course.manage') && !!me.orgId;
export const showsMergedContent = (me: MeResponse) => (can(me, 'content.publish') || can(me, 'content.edit_all')) && can(me, 'content.create');

const NAV: NavItem[] = [
  { href: '/admin/dashboard', label: { hi: 'डैशबोर्ड', en: 'Dashboard' }, show: (me) => can(me, 'user.manage') || can(me, 'content.edit_all') || can(me, 'content.review') || me.roleKeys.includes('SUPER_ADMIN') || (can(me, 'course.manage') && !!me.orgId) },
  { href: '/admin/organizations', label: { hi: 'संस्थान प्रबंधन', en: 'Manage Institutions' }, show: (me) => can(me, 'org.manage') },
  { href: '/admin/billing/plans', label: { hi: 'योजना प्रबंधन', en: 'Manage Plans' }, show: (me) => can(me, 'org.manage') || can(me, 'payment.manage') },
  // Whoever satisfies showsMergedStudents/showsMergedContent gets these
  // instead of the standalone pages below — see MERGE_GROUPS, which hides
  // the standalone ones for them.
  { href: '/admin/manage-students', label: { hi: 'छात्र प्रबंधन', en: 'Manage Students' }, show: showsMergedStudents },
  { href: '/admin/student-payments', label: { hi: 'छात्र भुगतान', en: 'Student Payments' }, show: (me) => can(me, 'course.manage') && !!me.orgId },
  { href: '/admin/earnings', label: { hi: 'कमाई व भुगतान', en: 'Earnings & Payouts' }, show: (me) => can(me, 'course.manage') && !!me.orgId },
  { href: '/admin/staff', label: { hi: 'स्टाफ़', en: 'Staff' }, show: (me) => can(me, 'user.manage') },
  { href: '/admin/students', label: { hi: 'छात्र', en: 'Students' }, show: (me) => can(me, 'user.manage') },
  { href: '/admin/roles', label: { hi: 'भूमिकाएँ व अनुमतियाँ', en: 'Roles & Permissions' }, show: (me) => can(me, 'role.manage') },
  { href: '/admin/exams', label: { hi: 'परीक्षाएँ', en: 'Exams & States' }, show: (me) => can(me, 'course.manage') },
  { href: '/admin/courses', label: { hi: 'कोर्स', en: 'Courses' }, show: (me) => can(me, 'course.manage') },
  { href: '/admin/manage-content', label: { hi: 'कंटेंट प्रबंधन', en: 'Manage Content' }, show: showsMergedContent },
  { href: '/admin/content', label: { hi: 'कंटेंट', en: 'Content' }, show: (me) => can(me, 'content.publish') || can(me, 'content.edit_all') },
  { href: '/admin/marketing', label: { hi: 'मार्केटिंग सामग्री', en: 'Marketing Content' }, show: (me) => can(me, 'marketing.manage') },
  { href: '/admin/blog', label: { hi: 'ब्लॉग', en: 'Blog' }, show: (me) => can(me, 'marketing.manage') },
  { href: '/admin/announcements', label: { hi: 'घोषणाएँ', en: 'Announcements' }, show: (me) => can(me, 'marketing.manage') },
  { href: '/admin/my-content', label: { hi: 'मेरा कंटेंट', en: 'My Content' }, show: (me) => can(me, 'content.create') },
  { href: '/admin/review-queue', label: { hi: 'समीक्षा क़तार', en: 'Review Queue' }, show: (me) => can(me, 'content.review') },
  { href: '/admin/current-affairs', label: { hi: 'करेंट अफेयर्स', en: 'Current Affairs' }, show: (me) => can(me, 'content.create') || can(me, 'content.review') },
  { href: '/admin/question-bank', label: { hi: 'प्रश्न बैंक', en: 'Question Bank' }, show: (me) => can(me, 'question.create') },
  { href: '/admin/mock-tests', label: { hi: 'मॉक टेस्ट', en: 'Mock Tests' }, show: (me) => can(me, 'test.create') || can(me, 'content.approve') },
  { href: '/admin/payments', label: { hi: 'भुगतान प्रबंधन', en: 'Manage Payments' }, show: (me) => can(me, 'payment.manage') },
  { href: '/admin/support', label: { hi: 'सहायता', en: 'Support' }, show: (me) => can(me, 'support.manage') },
  { href: '/admin/refunds', label: { hi: 'धनवापसी प्रबंधन', en: 'Refund Management' }, show: (me) => can(me, 'payment.manage') },
  { href: '/admin/activities', label: { hi: 'हाल की गतिविधियाँ', en: 'Recent Activities' }, show: (me) => can(me, 'audit.view') },
];

/** Super Admin is intentionally limited to platform-oversight sections only. */
const SUPER_ADMIN_NAV = new Set([
  '/admin/dashboard',
  '/admin/organizations',
  '/admin/billing/plans',
  '/admin/roles',
  '/admin/payments',
  '/admin/support',
  '/admin/refunds',
  '/admin/activities',
  '/admin/marketing',
  '/admin/blog',
  '/admin/announcements',
]);

/** Each merged nav entry hides its standalone halves for whoever qualifies
 *  for it (see showsMergedStudents/showsMergedContent above) — the pages
 *  themselves stay reachable directly for anyone who only has one half. */
const MERGE_GROUPS: { standaloneHrefs: string[]; applies: (me: MeResponse) => boolean }[] = [
  { standaloneHrefs: ['/admin/students', '/admin/student-payments'], applies: showsMergedStudents },
  { standaloneHrefs: ['/admin/content', '/admin/my-content'], applies: showsMergedContent },
];

export function Shell({
  me,
  locale,
  title,
  children,
}: {
  me: MeResponse;
  locale: Locale;
  title: string;
  children: ReactNode;
}) {
  const isSuper = me.roleKeys.includes('SUPER_ADMIN');
  const items = NAV.filter((n) => (isSuper ? SUPER_ADMIN_NAV.has(n.href) : n.show(me)))
    .filter((n) => !MERGE_GROUPS.some((g) => g.applies(me) && g.standaloneHrefs.includes(n.href)))
    .map((n) => ({
      href: n.href,
      label: locale === 'hi' ? n.label.hi : n.label.en,
    }));
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[240px_1fr]">
      <aside className="bg-navy-950 p-4 text-white">
        <div className="mb-6 flex items-center gap-2">
          <LogoMark size={32} />
          <span className="text-lg font-black">
            Rajya<span className="text-orange-500">Rank</span>
          </span>
        </div>
        <SideNav items={items} locale={locale} />
      </aside>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-line bg-white px-6 py-3">
          <h1 className="text-xl font-black text-navy-950">{title}</h1>
          <div className="flex items-center gap-3">
            <AdminLangSwitch locale={locale === 'hi' ? 'hi' : 'en'} />
            <ProfileMenu me={me} locale={locale} />
          </div>
        </header>
        <main id="main" className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
