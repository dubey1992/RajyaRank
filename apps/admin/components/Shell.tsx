import type { ReactNode } from 'react';
import Link from 'next/link';
import { LogoMark } from '@rajyarank/ui';
import type { MeResponse } from '@rajyarank/contracts';
import type { Locale } from '@/lib/i18n';
import { can } from '@/lib/permissions';
import { AdminLangSwitch } from './AdminLangSwitch';
import { ProfileMenu } from './ProfileMenu';
import { SideNav } from './SideNav';
import { SuspendedBanner } from './SuspendedBanner';

/** Shown to an org-scoped staff member (any role, not just the Head — the
 *  whole team should see the runway) once 7 or fewer trial days remain. Only
 *  the Head can act on it (billing.subscribe requires org.manage or the
 *  self-serve academic.billing.subscribe route, both Head-only), so
 *  non-Heads just see the notice with no CTA. */
function TrialBanner({ daysLeft, locale }: { daysLeft: number; locale: Locale }) {
  const hi = locale === 'hi';
  const urgent = daysLeft <= 3;
  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 px-4 py-2 text-center text-[13px] font-bold text-white ${urgent ? 'bg-danger' : 'bg-navy-900'}`}>
      <span>
        {daysLeft === 0
          ? hi
            ? 'आपका निःशुल्क ट्रायल आज समाप्त हो रहा है।'
            : 'Your free trial ends today.'
          : hi
            ? `आपका निःशुल्क ट्रायल ${daysLeft} दिन${daysLeft === 1 ? '' : 'ों'} में समाप्त हो रहा है।`
            : `Your free trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`}
      </span>
      <Link href={`/${locale}/admin/billing`} className="font-black underline">
        {hi ? 'अभी योजना चुनें →' : 'Choose a plan now →'}
      </Link>
    </div>
  );
}

/** Shown once a free trial has actually lapsed (orgTrialExpired) — TrialBanner
 *  above only covers the final 7-day countdown, which stops applying the
 *  instant the trial ends, otherwise leaving no persistent notice in the
 *  Shell at all until staff happen to hit a blocked action or the hard
 *  redirect on page load. Same audience/CTA-only-works-for-Head note as
 *  TrialBanner applies here too. */
function TrialExpiredBanner({ locale }: { locale: Locale }) {
  const hi = locale === 'hi';
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 bg-danger px-4 py-2 text-center text-[13px] font-bold text-white">
      <span>{hi ? 'आपका निःशुल्क ट्रायल समाप्त हो गया है।' : 'Your free trial has ended.'}</span>
      <Link href={`/${locale}/admin/billing`} className="font-black underline">
        {hi ? 'अभी योजना चुनें →' : 'Choose a plan now →'}
      </Link>
    </div>
  );
}

export interface NavItem {
  href: string;
  label: { hi: string; en: string };
  /** One-line "what this is for", shown on the Explore features page —
   *  never in the sidebar itself. */
  description: { hi: string; en: string };
  category: 'core' | 'students' | 'content' | 'tests' | 'finance' | 'marketing' | 'support' | 'platform';
  show: (me: MeResponse) => boolean;
}

// Merged nav entries are permission-driven, not role-driven — ANY role that
// would otherwise see both halves of a pair (Academic Head, Content Admin, or
// any future role granted the same permissions via the Permission Matrix)
// gets the single merged item instead of two separate ones.
export const showsMergedStudents = (me: MeResponse) => can(me, 'user.manage') && can(me, 'course.manage') && !!me.orgId;
export const showsMergedContent = (me: MeResponse) => (can(me, 'content.publish') || can(me, 'content.edit_all')) && can(me, 'content.create');
// Exams & States and Official Notices have independent permissions
// (course.manage vs. content.create/content.review) — Teacher and Academic
// Reviewer each hold only the Official Notices half, so they keep seeing it
// standalone (see MERGE_GROUPS) rather than losing it behind a merged tab
// page they can't open.
export const showsMergedExams = (me: MeResponse) => can(me, 'course.manage') && (can(me, 'content.create') || can(me, 'content.review'));
// Same logic for Question Bank vs. Mock Tests (question.create vs.
// test.create/content.approve) — Academic Reviewer holds only content.approve.
export const showsMergedTests = (me: MeResponse) => can(me, 'question.create') && (can(me, 'test.create') || can(me, 'content.approve'));

const NAV: NavItem[] = [
  { href: '/admin/dashboard', label: { hi: 'डैशबोर्ड', en: 'Dashboard' }, category: 'core', description: { hi: 'आपके संस्थान का सारांश — नामांकन, प्रगति और कमाई एक नज़र में।', en: 'Your institution at a glance — enrolments, progress, and earnings.' }, show: (me) => can(me, 'user.manage') || can(me, 'content.edit_all') || can(me, 'content.review') || me.roleKeys.includes('SUPER_ADMIN') || (can(me, 'course.manage') && !!me.orgId) },
  { href: '/admin/organizations', label: { hi: 'संस्थान प्रबंधन', en: 'Manage Institutions' }, category: 'platform', description: { hi: 'मंच पर हर संस्थान बनाएँ, निलंबित करें और निपटान देखें।', en: 'Create, suspend, and review settlements for every institution on the platform.' }, show: (me) => can(me, 'org.manage') },
  { href: '/admin/billing/plans', label: { hi: 'योजना प्रबंधन', en: 'Manage Plans' }, category: 'platform', description: { hi: 'संस्थानों के लिए सदस्यता योजनाएँ और बिलिंग नियम बनाएँ।', en: 'Define subscription plans and billing rules offered to institutions.' }, show: (me) => can(me, 'org.manage') || can(me, 'payment.manage') },
  // Whoever satisfies showsMerged*/above gets these instead of the standalone
  // pages below — see MERGE_GROUPS, which hides the standalone ones for them.
  // The pages themselves stay reachable directly for anyone who only has one
  // half (e.g. Teacher still gets a top-level Official Notices link).
  { href: '/admin/manage-students', label: { hi: 'छात्र प्रबंधन', en: 'Manage Students' }, category: 'students', description: { hi: 'अपने छात्रों की सूची देखें, जोखिम में छात्र खोजें और रेफ़रल ट्रैक करें।', en: 'View your student roster, spot at-risk students, and track referrals — all in one place.' }, show: showsMergedStudents },
  { href: '/admin/at-risk-students', label: { hi: 'इंटरवेंशन रडार', en: 'Intervention Radar' }, category: 'students', description: { hi: 'जो छात्र पिछड़ रहे हैं उन्हें पहले से पहचानें, इससे पहले कि वे छोड़ दें।', en: 'Spot students falling behind before they drop off, so staff can step in early.' }, show: (me) => can(me, 'user.manage') && !!me.orgId },
  { href: '/admin/reports', label: { hi: 'रिपोर्ट व एनालिटिक्स', en: 'Reports & Analytics' }, category: 'students', description: { hi: 'विषयवार प्रदर्शन, रुझान और लीडरबोर्ड के साथ गहरी रिपोर्ट।', en: 'Deep performance reports by subject, trend over time, and leaderboards.' }, show: (me) => can(me, 'reports.view') },
  // These three are financial/institution-billing screens — deliberately
  // role-checked (ACADEMIC_HEAD, covers a co-Head too — they carry the same
  // role key) rather than permission-checked on course.manage, which Content
  // Admin also holds for unrelated, legitimate course-management reasons and
  // has no business seeing institution payment data. Matches the equivalent
  // `roles` restriction on the backend routes these pages call.
  { href: '/admin/student-payments', label: { hi: 'छात्र भुगतान', en: 'Student Payments' }, category: 'finance', description: { hi: 'आपके छात्रों द्वारा किए गए सभी भुगतानों का रिकॉर्ड।', en: 'A record of every payment your students have made.' }, show: (me) => me.roleKeys.includes('ACADEMIC_HEAD') && !!me.orgId },
  { href: '/admin/earnings', label: { hi: 'कमाई व भुगतान', en: 'Earnings & Payouts' }, category: 'finance', description: { hi: 'आपके संस्थान की कमाई और उपलब्ध पेआउट देखें।', en: "Track your institution's gross sales and the payout available to you." }, show: (me) => me.roleKeys.includes('ACADEMIC_HEAD') && !!me.orgId },
  { href: '/admin/billing', label: { hi: 'सदस्यता व बिलिंग', en: 'Subscription & Billing' }, category: 'finance', description: { hi: 'अपने संस्थान की RajyaRank सदस्यता योजना और बिल देखें।', en: "Manage your institution's RajyaRank subscription plan and invoices." }, show: (me) => me.roleKeys.includes('ACADEMIC_HEAD') && !!me.orgId },
  { href: '/admin/referrals', label: { hi: 'रेफ़रल', en: 'Referrals' }, category: 'students', description: { hi: 'अपना रेफ़रल कोड साझा करें और नए छात्र लाएँ।', en: 'Share your referral code and track the new students it brings in.' }, show: (me) => can(me, 'course.manage') && !!me.orgId },
  { href: '/admin/staff', label: { hi: 'स्टाफ़ प्रबंधन', en: 'Manage Staffs' }, category: 'core', description: { hi: 'अपनी टीम में सदस्य जोड़ें और उन्हें भूमिकाएँ दें।', en: 'Invite team members to your institution and assign them roles.' }, show: (me) => can(me, 'user.manage') },
  { href: '/admin/students', label: { hi: 'छात्र', en: 'Students' }, category: 'students', description: { hi: 'अपने सभी नामांकित छात्रों की सूची और उनकी प्रोफ़ाइल।', en: 'The full list of your enrolled students and their profiles.' }, show: (me) => can(me, 'user.manage') },
  { href: '/admin/roles', label: { hi: 'भूमिकाएँ व अनुमतियाँ', en: 'Roles & Permissions' }, category: 'core', description: { hi: 'हर भूमिका को कौन-सी अनुमतियाँ मिलें, यह तय करें।', en: 'Decide exactly which permissions each staff role is granted.' }, show: (me) => can(me, 'role.manage') },
  { href: '/admin/manage-exams', label: { hi: 'परीक्षा प्रबंधन', en: 'Manage Exams' }, category: 'content', description: { hi: 'परीक्षाएँ/राज्य सेट करें और उनसे जुड़ी आधिकारिक सूचनाएँ प्रबंधित करें।', en: 'Set up exams and states, and manage the official notices linked to them.' }, show: showsMergedExams },
  { href: '/admin/exams', label: { hi: 'परीक्षाएँ', en: 'Exams & States' }, category: 'content', description: { hi: 'आपके कोर्स जिन परीक्षाओं और राज्यों को लक्षित करते हैं, उनकी सूची।', en: 'The list of exams and states your courses target.' }, show: (me) => can(me, 'course.manage') },
  { href: '/admin/courses', label: { hi: 'कोर्स प्रबंधन', en: 'Manage Courses' }, category: 'content', description: { hi: 'कोर्स बनाएँ, पाठ जोड़ें और मूल्य निर्धारण सेट करें — यहीं से शुरू करें।', en: 'Create courses, add lessons, and set pricing — start here first.' }, show: (me) => can(me, 'course.manage') },
  { href: '/admin/manage-content', label: { hi: 'कंटेंट प्रबंधन', en: 'Manage Content' }, category: 'content', description: { hi: 'पाठ, दस्तावेज़ और प्रकाशन पाइपलाइन एक ही जगह प्रबंधित करें।', en: 'Manage lessons, documents, and the content publishing pipeline together.' }, show: showsMergedContent },
  { href: '/admin/content', label: { hi: 'कंटेंट', en: 'Content' }, category: 'content', description: { hi: 'सभी पाठों और दस्तावेज़ों की सूची, प्रकाशन स्थिति के साथ।', en: 'The full list of lessons and documents, with publish status.' }, show: (me) => can(me, 'content.publish') || can(me, 'content.edit_all') },
  { href: '/admin/marketing', label: { hi: 'मार्केटिंग सामग्री', en: 'Marketing Content' }, category: 'marketing', description: { hi: 'वेबसाइट और ऐप पर दिखने वाली प्रचार सामग्री प्रबंधित करें।', en: 'Manage the promotional content shown on the website and app.' }, show: (me) => can(me, 'marketing.manage') },
  { href: '/admin/blog', label: { hi: 'ब्लॉग', en: 'Blog' }, category: 'marketing', description: { hi: 'सार्वजनिक ब्लॉग पोस्ट लिखें और प्रकाशित करें।', en: 'Write and publish public blog posts.' }, show: (me) => can(me, 'marketing.manage') },
  { href: '/admin/announcements', label: { hi: 'घोषणाएँ', en: 'Announcements' }, category: 'marketing', description: { hi: 'छात्रों को ऐप के अंदर घोषणाएँ भेजें।', en: 'Push in-app announcements out to students.' }, show: (me) => can(me, 'marketing.manage') },
  { href: '/admin/mobile-releases', label: { hi: 'मोबाइल ऐप', en: 'Mobile App' }, category: 'platform', description: { hi: 'मोबाइल ऐप के संस्करण और रिलीज़ प्रबंधित करें।', en: 'Manage mobile app versions and releases.' }, show: (me) => can(me, 'app.manage') },
  { href: '/admin/my-content', label: { hi: 'मेरा कंटेंट', en: 'My Content' }, category: 'content', description: { hi: 'आपके द्वारा लिखा गया कंटेंट और उसकी समीक्षा स्थिति।', en: "Content you've authored and its review status." }, show: (me) => can(me, 'content.create') },
  { href: '/admin/review-queue', label: { hi: 'समीक्षा क़तार', en: 'Review Queue' }, category: 'content', description: { hi: 'प्रकाशन से पहले समीक्षा के लिए प्रतीक्षित कंटेंट।', en: 'Content waiting for your review before it goes live.' }, show: (me) => can(me, 'content.review') },
  { href: '/admin/current-affairs', label: { hi: 'करेंट अफेयर्स', en: 'Current Affairs' }, category: 'content', description: { hi: 'दैनिक करंट अफेयर्स लिखें और प्रकाशित करें।', en: 'Write and publish daily current affairs.' }, show: (me) => can(me, 'content.create') || can(me, 'content.review') },
  { href: '/admin/manage-tests', label: { hi: 'टेस्ट प्रबंधन', en: 'Manage Tests' }, category: 'tests', description: { hi: 'प्रश्न बैंक से टेस्ट बनाएँ, प्रकाशित करें और स्वीकृत करें।', en: 'Build tests from the question bank, publish them, and approve them.' }, show: showsMergedTests },
  { href: '/admin/question-bank', label: { hi: 'प्रश्न बैंक', en: 'Question Bank' }, category: 'tests', description: { hi: 'प्रश्न लिखें और टेस्ट बनाने के लिए संग्रहित करें।', en: 'Author questions and bank them for building tests.' }, show: (me) => can(me, 'question.create') },
  { href: '/admin/concepts', label: { hi: 'कॉन्सेप्ट ग्राफ़', en: 'Concept Graph' }, category: 'content', description: { hi: 'विषयों के बीच कॉन्सेप्ट संबंध मैप करें ताकि सिफ़ारिशें सटीक हों।', en: 'Map concept relationships across topics to power accurate recommendations.' }, show: (me) => can(me, 'course.manage') },
  { href: '/admin/content-packs', label: { hi: 'कंटेंट पैक', en: 'Content Packs' }, category: 'content', description: { hi: 'कई पाठ और टेस्ट एक साथ एक कीमत पर बेचें।', en: 'Sell several lessons and tests together at one price.' }, show: (me) => can(me, 'course.manage') },
  { href: '/admin/official-notices', label: { hi: 'आधिकारिक सूचनाएँ', en: 'Official Notices' }, category: 'content', description: { hi: 'परीक्षा बोर्डों की आधिकारिक अधिसूचनाएँ जोड़ें और प्रकाशित करें।', en: "Add and publish exam boards' official notifications." }, show: (me) => can(me, 'content.create') || can(me, 'content.review') },
  { href: '/admin/mock-tests', label: { hi: 'मॉक टेस्ट', en: 'Mock Tests' }, category: 'tests', description: { hi: 'पूर्ण-लंबाई वाले मॉक टेस्ट बनाएँ और स्वीकृत करें।', en: 'Build and approve full-length mock tests.' }, show: (me) => can(me, 'test.create') || can(me, 'content.approve') },
  { href: '/admin/payments', label: { hi: 'भुगतान प्रबंधन', en: 'Manage Payments' }, category: 'finance', description: { hi: 'मंच पर हुए सभी भुगतानों की निगरानी करें।', en: 'Oversee every payment made across the platform.' }, show: (me) => can(me, 'payment.manage') },
  // Support Agent + Super Admin only — Academic Head also holds
  // support.manage (for Customer Lookup/Ratings Moderation below, both
  // unrelated to this queue) but no longer gets the ticket queue itself;
  // they handle lesson doubts via Doubt Queue instead. Role-checked rather
  // than permission-checked, matching support.service.ts's server-side gate.
  { href: '/admin/support', label: { hi: 'सहायता', en: 'Support' }, category: 'support', description: { hi: 'छात्रों की सहायता टिकट क़तार संभालें।', en: 'Work through the student support ticket queue.' }, show: (me) => me.roleKeys.includes('SUPPORT_AGENT') },
  // Separate from Support above — Teacher/Content Admin/Academic Reviewer
  // hold doubt.respond but not support.manage, and still need their own
  // queue (see doubts/page.tsx for the matching server-side gate).
  { href: '/admin/doubts', label: { hi: 'शंका समाधान', en: 'Doubt Queue' }, category: 'support', description: { hi: 'छात्रों द्वारा पाठों पर पूछे गए सवालों के जवाब दें।', en: "Answer questions students have asked on lessons." }, show: (me) => can(me, 'doubt.respond') },
  { href: '/admin/customer-lookup', label: { hi: 'ग्राहक खोज', en: 'Customer Lookup' }, category: 'support', description: { hi: 'किसी भी छात्र को खोजें और उसका खाता/भुगतान इतिहास देखें।', en: "Look up any student and view their account/payment history." }, show: (me) => can(me, 'support.manage') },
  // Super-Admin-only oversight tool, not a general support.manage feature —
  // deliberately role-checked rather than permission-checked, even though
  // Support Agent/Academic Head also hold support.manage (see below, and
  // students.service.ts#listIndependent for the matching server-side check).
  { href: '/admin/independent-students', label: { hi: 'स्वतंत्र छात्र', en: 'Independent Students' }, category: 'platform', description: { hi: 'किसी संस्थान से न जुड़े छात्रों की निगरानी करें।', en: 'Oversee students who are not affiliated with any institution.' }, show: (me) => me.roleKeys.includes('SUPER_ADMIN') },
  { href: '/admin/ratings', label: { hi: 'रेटिंग मॉडरेशन', en: 'Ratings Moderation' }, category: 'support', description: { hi: 'कोर्स रेटिंग और रिव्यू को मॉडरेट करें।', en: 'Moderate course ratings and reviews.' }, show: (me) => can(me, 'support.manage') },
  { href: '/admin/refunds', label: { hi: 'धनवापसी प्रबंधन', en: 'Refund Management' }, category: 'finance', description: { hi: 'धनवापसी के अनुरोधों की समीक्षा करें और संसाधित करें।', en: 'Review and process refund requests.' }, show: (me) => can(me, 'payment.manage') },
  { href: '/admin/activities', label: { hi: 'हाल की गतिविधियाँ', en: 'Recent Activities' }, category: 'platform', description: { hi: 'मंच पर हाल की स्टाफ़ कार्रवाइयों का ऑडिट लॉग।', en: 'An audit log of recent staff actions across the platform.' }, show: (me) => can(me, 'audit.view') },
];

/** Super Admin is intentionally limited to platform-oversight sections only. */
const SUPER_ADMIN_NAV = new Set([
  '/admin/dashboard',
  '/admin/reports',
  '/admin/organizations',
  '/admin/billing/plans',
  '/admin/roles',
  '/admin/payments',
  '/admin/support',
  '/admin/customer-lookup',
  '/admin/independent-students',
  '/admin/ratings',
  '/admin/refunds',
  '/admin/activities',
  '/admin/marketing',
  '/admin/blog',
  '/admin/announcements',
  '/admin/mobile-releases',
]);

/** Each merged nav entry hides its standalone halves for whoever qualifies
 *  for it (see showsMerged* above) — the pages themselves stay reachable
 *  directly for anyone who only has one half. Intervention Radar rides along
 *  with the Manage Students merge: it becomes a third tab there (see
 *  manage-students/page.tsx) whenever the merge applies, since
 *  showsMergedStudents already requires user.manage — Intervention Radar's
 *  own permission — so nothing is hidden that the merge doesn't also grant. */
const MERGE_GROUPS: { standaloneHrefs: string[]; applies: (me: MeResponse) => boolean }[] = [
  // Referrals rides along the same way Intervention Radar does (see the doc
  // comment above): showsMergedStudents already requires course.manage +
  // orgId, which is Referrals' own standalone gate, so nothing is hidden
  // that the merge doesn't also grant. A role with course.manage + orgId but
  // NOT user.manage (so showsMergedStudents is false) still sees the
  // standalone Referrals link — see /admin/referrals/page.tsx, unchanged.
  { standaloneHrefs: ['/admin/students', '/admin/student-payments', '/admin/at-risk-students', '/admin/referrals'], applies: showsMergedStudents },
  { standaloneHrefs: ['/admin/content', '/admin/my-content'], applies: showsMergedContent },
  { standaloneHrefs: ['/admin/exams', '/admin/official-notices'], applies: showsMergedExams },
  { standaloneHrefs: ['/admin/question-bank', '/admin/mock-tests'], applies: showsMergedTests },
];

/** The exact set of NAV entries a given user can see, after the Super Admin
 *  allowlist and the merge-group hiding — shared between the sidebar and the
 *  Explore features page so the two can never drift apart. */
export function visibleNavItems(me: MeResponse) {
  const isSuper = me.roleKeys.includes('SUPER_ADMIN');
  return NAV.filter((n) => (isSuper ? SUPER_ADMIN_NAV.has(n.href) : n.show(me)))
    .filter((n) => !MERGE_GROUPS.some((g) => g.applies(me) && g.standaloneHrefs.includes(n.href)));
}

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
  const items = visibleNavItems(me)
    .map((n) => ({
      href: n.href,
      label: locale === 'hi' ? n.label.hi : n.label.en,
    }))
    .concat([{ href: '/admin/explore', label: locale === 'hi' ? 'सुविधाएँ खोजें' : 'Explore features' }]);
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
        {me.orgId && me.orgSuspended ? (
          <SuspendedBanner locale={locale} />
        ) : me.orgId && me.orgTrialExpired ? (
          <TrialExpiredBanner locale={locale} />
        ) : me.orgId && me.orgTrialDaysLeft !== null ? (
          <TrialBanner daysLeft={me.orgTrialDaysLeft} locale={locale} />
        ) : null}
        <main id="main" className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
