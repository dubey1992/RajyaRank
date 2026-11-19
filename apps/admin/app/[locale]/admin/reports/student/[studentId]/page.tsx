import Link from 'next/link';
import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { Card, StatTile, categoricalColor } from '@rajyarank/ui';
import type { StudentPerformanceDetail } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

/** One student's performance drill-down — reachable from either leaderboard
 *  on the Reports page. The backend enforces ownership (Academic Head can
 *  only open a student in their own org, 403 otherwise); this page just
 *  renders whatever apiFetchServer returns (null on 403/404, handled below). */
export default async function StudentPerformancePage({ params }: { params: { locale: string; studentId: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'छात्र प्रदर्शन' : 'Student performance';

  if (!can(me, 'reports.view')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="reports.view" />
      </Shell>
    );
  }

  const detail = await apiFetchServer<StudentPerformanceDetail>(`/admin/analytics/student-performance/${params.studentId}`, cookies().toString());

  if (!detail) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <p className="text-sm text-muted">{hi ? 'यह छात्र नहीं मिला या आपके पास पहुँच नहीं है।' : 'Student not found, or you do not have access.'}</p>
      </Shell>
    );
  }

  return (
    <Shell me={me} locale={locale} title={detail.name}>
      <Link href={`/${locale}/admin/reports`} className="mb-4 inline-block text-xs font-extrabold text-orange-600">
        ← {hi ? 'रिपोर्ट पर वापस' : 'Back to reports'}
      </Link>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatTile label={hi ? 'औसत स्कोर' : 'Average score'} value={detail.avgScorePercent === null ? '—' : `${detail.avgScorePercent}%`} />
        <StatTile label={hi ? 'कुल प्रयास' : 'Total attempts'} value={detail.totalAttempts} />
        <StatTile label={hi ? 'कमज़ोर कॉन्सेप्ट' : 'Weak concepts'} value={detail.weakConcepts.length} valueClassName={detail.weakConcepts.length > 0 ? 'text-warning' : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-extrabold text-navy-900">{hi ? 'हाल के प्रयास' : 'Recent attempts'}</h3>
          {detail.recentAttempts.length === 0 ? (
            <p className="text-xs text-muted">{hi ? 'अभी कोई प्रयास नहीं।' : 'No attempts yet.'}</p>
          ) : (
            <div className="grid gap-1.5">
              {detail.recentAttempts.map((a) => (
                <div key={a.attemptId} className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-xs">
                  <div>
                    <div className="font-bold text-ink">{a.testTitleEn}</div>
                    <div className="text-muted">{a.submittedAt ? new Date(a.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</div>
                  </div>
                  <span className="font-extrabold text-navy-900">{a.scorePercent === null ? '—' : `${a.scorePercent}%`}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-extrabold text-navy-900">{hi ? 'विषय-वार सटीकता' : 'Subject-wise accuracy'}</h3>
          {detail.subjects.length === 0 ? (
            <p className="text-xs text-muted">{hi ? 'अभी कोई डेटा नहीं।' : 'No data yet.'}</p>
          ) : (
            <div className="grid gap-2">
              {detail.subjects.map((s, i) => {
                const pct = s.accuracyPercent ?? 0;
                return (
                  <div key={s.subjectId} className="text-xs">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-bold text-ink">{hi ? s.subjectNameHi : s.subjectNameEn}</span>
                      <span className="font-extrabold text-navy-900">{s.accuracyPercent === null ? '—' : `${s.accuracyPercent}%`}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-soft">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: categoricalColor(i) }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {detail.weakConcepts.length > 0 ? (
          <Card className="lg:col-span-2">
            <h3 className="mb-3 text-sm font-extrabold text-navy-900">{hi ? 'सबसे कमज़ोर कॉन्सेप्ट (60% से कम सटीकता)' : 'Weakest concepts (under 60% accuracy)'}</h3>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {detail.weakConcepts.map((c) => (
                <div key={c.conceptId} className="flex items-center justify-between rounded-md border border-warning/30 bg-orange-100/30 px-3 py-2 text-xs">
                  <span className="font-bold text-ink">{c.conceptNameEn}</span>
                  <span className="font-extrabold text-warning">{c.accuracyPercent === null ? '—' : `${c.accuracyPercent}%`}</span>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </Shell>
  );
}
