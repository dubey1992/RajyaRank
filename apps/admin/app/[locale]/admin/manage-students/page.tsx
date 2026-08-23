import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { StudentsManager } from '@/components/StudentsManager';
import { StudentPaymentsManager } from '@/components/StudentPaymentsManager';
import { AtRiskStudentsTable } from '@/components/AtRiskStudentsTable';
import { TabbedSections, type TabSection } from '@/components/TabbedSections';
import { ReferralLinkInput } from '../referrals/ReferralLinkInput';
import type { StudentListItem, AcademicOrderView, AtRiskStudentView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

interface ReferralStats {
  accessCode: string | null;
  totalReferredSignups: number;
  convertedSignups: number;
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/** Students + their payment ledger + at-risk radar, merged into one page for
 *  anyone who'd otherwise see all three as separate nav entries (see
 *  showsMergedStudents in Shell.tsx). */
export default async function ManageStudentsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'छात्र प्रबंधन' : 'Manage Students';

  const canStudents = can(me, 'user.manage');
  const canPayments = can(me, 'course.manage');
  // Intervention Radar's own permission (see Shell.tsx) — org-scoped, same as
  // canStudents requires user.manage, but independently checked here since a
  // future custom role could hold user.manage without an orgId.
  const canRadar = canStudents && !!me.orgId;
  // Referrals' own permission (matches /admin/referrals/page.tsx exactly) —
  // course.manage + orgId, same condition as canPayments plus the orgId
  // check, since canPayments alone doesn't guarantee an org-scoped actor.
  const canReferrals = canPayments && !!me.orgId;
  if (!canStudents && !canPayments) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="user.manage" />
      </Shell>
    );
  }

  const cookie = cookies().toString();
  const [students, orders, atRisk, referralStats] = await Promise.all([
    canStudents ? apiFetchServer<StudentListItem[]>('/admin/students', cookie) : Promise.resolve(null),
    canPayments ? apiFetchServer<AcademicOrderView[]>('/academic/orders', cookie) : Promise.resolve(null),
    canRadar ? apiFetchServer<AtRiskStudentView[]>('/admin/analytics/at-risk-students', cookie) : Promise.resolve(null),
    canReferrals ? apiFetchServer<ReferralStats>('/academic/organization/referrals', cookie) : Promise.resolve(null),
  ]);

  const sections: TabSection[] = [];
  if (canStudents) {
    sections.push({
      key: 'students',
      label: hi ? 'छात्र' : 'Students',
      content: (
        <>
          <p className="mb-4 max-w-2xl text-sm text-muted">
            {hi
              ? 'अपने संस्थान के छात्रों को नामांकित व प्रबंधित करें। नामांकित छात्र ईमेल व पासवर्ड से लॉगिन करते हैं।'
              : 'Enroll and manage your institution’s students. Enrolled students sign in with their email & password.'}
          </p>
          <StudentsManager initial={students ?? []} locale={locale} canDisable={can(me, 'user.disable')} />
        </>
      ),
    });
  }
  if (canPayments && orders) {
    sections.push({
      key: 'payments',
      label: hi ? 'भुगतान' : 'Payments',
      content: (
        <>
          <p className="mb-4 max-w-2xl text-sm text-muted">
            {hi ? 'एक ही लेजर में आंतरिक, बाहरी और प्रायोजित पहुँच।' : 'Internal, external and sponsored access in a single ledger.'}
          </p>
          <StudentPaymentsManager orders={orders} locale={locale} />
        </>
      ),
    });
  }
  if (canRadar) {
    sections.push({
      key: 'at-risk',
      label: hi ? 'इंटरवेंशन रडार' : 'Intervention Radar',
      content: (
        <>
          <p className="mb-4 max-w-2xl text-sm text-muted">
            {hi
              ? 'निष्क्रियता, स्टडी प्लान में पिछड़ने, स्कोर में गिरावट या दोहराई जा रही ग़लतियों के आधार पर आपके संस्थान के जोखिम में छात्र — जोखिम स्तर के अनुसार क्रमबद्ध। हर घंटे अपडेट होता है।'
              : "Your institution's students flagged by inactivity, falling behind their study plan, a score decline, or a repeated mistake pattern — sorted by risk level. Refreshes hourly."}
          </p>
          <AtRiskStudentsTable students={atRisk ?? []} locale={locale} />
        </>
      ),
    });
  }
  if (canReferrals) {
    const link = referralStats?.accessCode ? `${SITE}/${locale}?ref=${referralStats.accessCode}` : null;
    const shareText = hi
      ? `RajyaRank पर मुफ़्त क्विज़ और तैयारी सामग्री देखें: ${link}`
      : `Check out free quizzes and prep material on RajyaRank: ${link}`;
    sections.push({
      key: 'referrals',
      label: hi ? 'रेफ़रल' : 'Referrals',
      content: (
        <>
          <p className="mb-4 max-w-2xl text-sm text-muted">
            {hi
              ? 'अपने छात्रों को यह लिंक भेजें — जो भी इससे साइन अप करता है, वह यहाँ गिना जाएगा। यह वही कोड है जो चेकआउट पर संस्थान की कीमत अनलॉक करता है।'
              : 'Share this link with your students — anyone who signs up through it counts here. Same code that unlocks your institute pricing at checkout.'}
          </p>
          {!referralStats?.accessCode ? (
            <p className="text-sm text-muted">{hi ? 'अभी जारी नहीं। Super Admin से संपर्क करें।' : 'Not issued yet — contact your Super Admin.'}</p>
          ) : (
            <>
              <div className="mb-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-line bg-white p-5">
                  <div className="text-3xl font-black text-navy-950">{referralStats.totalReferredSignups}</div>
                  <p className="mt-1 text-sm text-muted">{hi ? 'रेफ़र किए गए साइनअप' : 'Referred signups'}</p>
                </div>
                <div className="rounded-lg border border-line bg-white p-5">
                  <div className="text-3xl font-black text-navy-950">{referralStats.convertedSignups}</div>
                  <p className="mt-1 text-sm text-muted">{hi ? 'भुगतान करने वाले छात्र' : 'Converted to paying students'}</p>
                </div>
              </div>
              <div className="rounded-lg border border-line bg-white p-5">
                <label className="mb-1.5 block text-xs font-extrabold uppercase text-muted">{hi ? 'आपका रेफ़रल लिंक' : 'Your referral link'}</label>
                <ReferralLinkInput value={link ?? ''} />
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-extrabold text-white hover:bg-orange-600"
                >
                  {hi ? 'WhatsApp पर शेयर करें' : 'Share on WhatsApp'}
                </a>
              </div>
            </>
          )}
        </>
      ),
    });
  }

  return (
    <Shell me={me} locale={locale} title={title}>
      <TabbedSections sections={sections} />
    </Shell>
  );
}
