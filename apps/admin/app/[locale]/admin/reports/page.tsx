import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { PerformanceDashboard } from '@/components/PerformanceDashboard';
import { SubjectPerformanceTable } from '@/components/SubjectPerformanceTable';
import { LiveClassEngagementCards } from '@/components/LiveClassEngagementCards';
import type {
  PerformanceOverview,
  PerformanceTrendPoint,
  SubjectPerformanceRow,
  InstitutionLeaderboardRow,
  StudentLeaderboardRow,
  LiveClassEngagementRow,
} from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

/** Deep-dive version of the dashboard's Performance Reports section — same
 *  data, same orgId-branching, plus the full subject table (the dashboard
 *  card only shows the top 8 bars). Super Admin sees it platform-wide with
 *  the institution leaderboard; Academic Head sees their own org with the
 *  student leaderboard — identical branch to PerformanceDashboard on the
 *  dashboard page, just as a standalone page for a focused look. */
export default async function ReportsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'रिपोर्ट व एनालिटिक्स' : 'Reports & Analytics';

  if (!can(me, 'reports.view')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="reports.view" />
      </Shell>
    );
  }

  const isSuper = me.roleKeys.includes('SUPER_ADMIN');
  const cookie = cookies().toString();
  const [overview, trend, bySubject, institutionLeaderboard, studentLeaderboard, liveClassEngagement] = await Promise.all([
    apiFetchServer<PerformanceOverview>('/admin/analytics/performance-overview', cookie),
    apiFetchServer<PerformanceTrendPoint[]>('/admin/analytics/performance-trend', cookie),
    apiFetchServer<SubjectPerformanceRow[]>('/admin/analytics/performance-by-subject', cookie),
    isSuper ? apiFetchServer<InstitutionLeaderboardRow[]>('/admin/analytics/institution-leaderboard', cookie) : Promise.resolve(null),
    !isSuper ? apiFetchServer<StudentLeaderboardRow[]>('/admin/analytics/student-leaderboard', cookie) : Promise.resolve(null),
    apiFetchServer<LiveClassEngagementRow[]>('/admin/analytics/live-class-engagement', cookie),
  ]);

  return (
    <Shell me={me} locale={locale} title={title}>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        {hi
          ? isSuper
            ? 'सभी संस्थानों और छात्रों में शैक्षणिक प्रदर्शन — स्कोर, सटीकता और रुझान। डेमो संस्थान हमेशा बाहर रखे जाते हैं।'
            : 'आपके संस्थान के छात्रों का शैक्षणिक प्रदर्शन — स्कोर, सटीकता और रुझान।'
          : isSuper
            ? 'Academic performance across every institution and student — scores, accuracy and trends. Demo institutions are always excluded.'
            : "Your institution's students' academic performance — scores, accuracy and trends."}
      </p>
      {overview && trend && bySubject ? (
        <>
          <PerformanceDashboard
            locale={locale}
            overview={overview}
            trend={trend}
            subjects={bySubject}
            institutionLeaderboard={institutionLeaderboard}
            studentLeaderboard={studentLeaderboard}
          />
          <SubjectPerformanceTable subjects={bySubject} locale={locale} />
          <h2 className="mb-3 mt-8 text-lg font-black text-navy-900">{hi ? 'लाइव क्लास एंगेजमेंट' : 'Live Classes engagement'}</h2>
          <LiveClassEngagementCards rows={liveClassEngagement ?? []} locale={locale} />
        </>
      ) : (
        <p className="text-sm text-muted">{hi ? 'डेटा लोड नहीं हो सका।' : 'Could not load report data.'}</p>
      )}
    </Shell>
  );
}
