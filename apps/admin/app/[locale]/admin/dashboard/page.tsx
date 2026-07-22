import Link from 'next/link';
import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { Shell, showsMergedContent } from '@/components/Shell';
import { AnalyticsCards, type Overview } from '@/components/AnalyticsCards';
import { InstitutionOverviewCards, type InstitutionOverview } from '@/components/InstitutionOverviewCards';
import { ContentPipelineCards, type ContentPipelineOverview } from '@/components/ContentPipelineCards';
import { ReviewOverviewCards, type ReviewOverview } from '@/components/ReviewOverviewCards';
import { can } from '@/lib/permissions';
import type { OrganizationView, SettlementSummaryView, InstitutionEarningsView } from '@rajyarank/contracts';

function rupees(minor: number) {
  return `₹${(minor / 100).toLocaleString('en-IN')}`;
}

export const dynamic = 'force-dynamic';

export default async function AdminDashboard({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const cookie = cookies().toString();
  const isSuper = me.roleKeys.includes('SUPER_ADMIN');
  // Org-scoped, permission-driven (not a role-name literal) — matches each
  // endpoint's own gate exactly, so a Permission Matrix edit is reflected here
  // too: /admin/staff + institution-overview require user.manage, institution
  // earnings requires course.manage, both additionally require an orgId.
  const isOrgUserManager = can(me, 'user.manage') && !!me.orgId;
  const isOrgCourseManager = can(me, 'course.manage') && !!me.orgId;
  const showsInstitutionSection = isOrgUserManager || isOrgCourseManager;
  // content.edit_all is held by both ACADEMIC_HEAD and CONTENT_ADMIN — the
  // endpoint itself scopes to the actor's org when present, platform-wide
  // otherwise, so one flag correctly serves both roles.
  const showsContentPipeline = can(me, 'content.edit_all');
  const isReviewer = can(me, 'content.review');

  const [orgs, overview, institution, contentPipeline, reviewOverview, financeSummary, institutionEarnings] = await Promise.all([
    isSuper ? apiFetchServer<OrganizationView[]>('/admin/organizations', cookie) : Promise.resolve(null),
    can(me, 'audit.view') ? apiFetchServer<Overview>('/admin/analytics/overview', cookie) : Promise.resolve(null),
    isOrgUserManager ? apiFetchServer<InstitutionOverview>('/admin/analytics/institution-overview', cookie) : Promise.resolve(null),
    showsContentPipeline ? apiFetchServer<ContentPipelineOverview>('/admin/analytics/content-pipeline', cookie) : Promise.resolve(null),
    isReviewer ? apiFetchServer<ReviewOverview>('/admin/analytics/review-overview', cookie) : Promise.resolve(null),
    can(me, 'org.manage') ? apiFetchServer<SettlementSummaryView>('/admin/settlements/summary', cookie) : Promise.resolve(null),
    isOrgCourseManager ? apiFetchServer<InstitutionEarningsView>('/academic/settlements/earnings', cookie) : Promise.resolve(null),
  ]);

  const quickLinks: { href: string; label: string; show: boolean }[] = [
    { href: '/admin/staff', label: hi ? 'स्टाफ़' : 'Staff', show: can(me, 'user.manage') },
    { href: '/admin/courses', label: hi ? 'कोर्स' : 'Courses', show: can(me, 'course.manage') },
    { href: showsMergedContent(me) ? '/admin/manage-content' : '/admin/content', label: hi ? 'कंटेंट' : 'Content', show: can(me, 'content.edit_all') || can(me, 'content.review') },
    { href: '/admin/question-bank', label: hi ? 'प्रश्न बैंक' : 'Question Bank', show: can(me, 'question.create') },
    { href: '/admin/support', label: hi ? 'सहायता' : 'Support', show: can(me, 'support.manage') },
  ];

  return (
    <Shell me={me} locale={locale} title={hi ? 'प्रशासन' : 'Administration'}>
      {/* Super Admin: institutions directory summary */}
      {isSuper ? (
        <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white p-5">
          <div>
            <div className="text-xs font-extrabold uppercase text-muted">{hi ? 'संस्थान' : 'Institutions'}</div>
            <div className="text-2xl font-black text-navy-900">{orgs?.length ?? 0}</div>
          </div>
          <Link href={`/${locale}/admin/organizations`} className="rounded-md bg-orange-500 px-4 py-2 text-sm font-extrabold text-white hover:bg-orange-600">
            {hi ? 'संस्थान प्रबंधित करें' : 'Manage institutions'}
          </Link>
        </section>
      ) : null}

      {/* Super Admin: platform finance summary (institution subscriptions + marketplace commission) */}
      {financeSummary ? (
        <section className="mb-6 rounded-lg border border-line bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black text-navy-900">{hi ? 'मंच वित्त' : 'Platform Finance'}</h2>
            <div className="flex gap-2">
              <Link href={`/${locale}/admin/billing/plans?tab=billing`} className="rounded-md border border-line px-3 py-1.5 text-xs font-extrabold text-navy-900 hover:bg-surface-soft">{hi ? 'बिलिंग' : 'Billing'}</Link>
              <Link href={`/${locale}/admin/organizations?tab=settlements`} className="rounded-md border border-line px-3 py-1.5 text-xs font-extrabold text-navy-900 hover:bg-surface-soft">{hi ? 'निपटान' : 'Settlements'}</Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-line bg-surface-soft p-3">
              <div className="text-xs font-extrabold uppercase text-muted">{hi ? 'मंच राजस्व' : 'Platform revenue'}</div>
              <div className="mt-1 text-xl font-black text-navy-950">{rupees(financeSummary.platformRevenueMinor)}</div>
            </div>
            <div className="rounded-md border border-line bg-surface-soft p-3">
              <div className="text-xs font-extrabold uppercase text-muted">{hi ? 'संस्थान देय' : 'Institution payable'}</div>
              <div className="mt-1 text-xl font-black text-navy-950">{rupees(financeSummary.institutionPayableMinor)}</div>
            </div>
            <div className="rounded-md border border-line bg-surface-soft p-3">
              <div className="text-xs font-extrabold uppercase text-muted">{hi ? 'रिज़र्व होल्ड' : 'Reserve held'}</div>
              <div className="mt-1 text-xl font-black text-navy-950">{rupees(financeSummary.reserveHeldMinor)}</div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Institution snapshot + quick links, for any org-scoped user/course manager */}
      {showsInstitutionSection ? (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-black text-navy-900">{hi ? 'आपका संस्थान' : 'Your institution'}</h2>
          {institution ? <InstitutionOverviewCards data={institution} locale={locale} /> : null}
          {institutionEarnings ? (
            <div className="mb-4 rounded-lg border border-line bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-navy-900">{hi ? 'संस्थान कमाई' : 'Institution earnings'}</h3>
                <Link href={`/${locale}/admin/earnings`} className="rounded-md border border-line px-3 py-1.5 text-xs font-extrabold text-navy-900 hover:bg-surface-soft">{hi ? 'विवरण देखें' : 'View details'}</Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-line bg-surface-soft p-3">
                  <div className="text-xs font-extrabold uppercase text-muted">{hi ? 'कुल बिक्री' : 'Gross sales'}</div>
                  <div className="mt-1 text-xl font-black text-navy-950">{rupees(institutionEarnings.internalGrossMinor + institutionEarnings.externalGrossMinor)}</div>
                </div>
                <div className="rounded-md border border-line bg-surface-soft p-3">
                  <div className="text-xs font-extrabold uppercase text-muted">{hi ? 'उपलब्ध भुगतान' : 'Available payout'}</div>
                  <div className="mt-1 text-xl font-black text-navy-950">{rupees(institutionEarnings.payableMinor)}</div>
                </div>
                <div className="rounded-md border border-line bg-surface-soft p-3">
                  <div className="text-xs font-extrabold uppercase text-muted">{hi ? 'भुगतान स्थिति' : 'Payout status'}</div>
                  <div className="mt-1 text-sm font-extrabold text-navy-950">
                    {institutionEarnings.linkedAccount?.payoutsEnabled
                      ? (hi ? 'सक्षम' : 'Enabled')
                      : (hi ? 'लंबित KYC' : 'KYC pending')}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-3">
            {quickLinks.filter((q) => q.show).map((q) => (
              <Link key={q.href} href={`/${locale}${q.href}`} className="rounded-md border border-line bg-white px-3 py-3 text-center text-sm font-extrabold text-navy-900 hover:border-orange-500 hover:bg-surface-soft">
                {q.label}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Content Admin (and Academic Head): production pipeline */}
      {contentPipeline ? <ContentPipelineCards data={contentPipeline} locale={locale} /> : null}

      {/* Academic Reviewer: review queue snapshot */}
      {reviewOverview ? <ReviewOverviewCards data={reviewOverview} locale={locale} /> : null}

      {/* Platform metrics (Super Admin) */}
      {overview ? <AnalyticsCards data={overview} locale={locale} /> : null}
    </Shell>
  );
}
