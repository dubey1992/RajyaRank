'use client';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, ChartCard, StatTile, categoricalColor, BRAND_SERIES } from '@rajyarank/ui';
import type {
  PerformanceOverview,
  PerformanceTrendPoint,
  SubjectPerformanceRow,
  InstitutionLeaderboardRow,
  StudentLeaderboardRow,
} from '@rajyarank/contracts';
import type { Locale } from '@/lib/i18n';

function Pct({ value }: { value: number | null }) {
  return <>{value === null ? '—' : `${value}%`}</>;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line bg-white px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-extrabold text-navy-900">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <strong>{p.value}%</strong>
        </div>
      ))}
    </div>
  );
}

/** Student & Institution Performance Reports — Super Admin sees it platform-
 *  wide (plus the institution leaderboard), Academic Head sees their own
 *  org's students/subjects only (plus their student leaderboard instead).
 *  The backend branches on principal.orgId; this component just renders
 *  whichever of institutionLeaderboard/studentLeaderboard the page fetched. */
export function PerformanceDashboard({
  locale,
  overview,
  trend,
  subjects,
  institutionLeaderboard,
  studentLeaderboard,
}: {
  locale: Locale;
  overview: PerformanceOverview;
  trend: PerformanceTrendPoint[];
  subjects: SubjectPerformanceRow[];
  institutionLeaderboard?: InstitutionLeaderboardRow[] | null;
  studentLeaderboard?: StudentLeaderboardRow[] | null;
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const p = (path: string) => `/${locale}${path}`;

  const recentDelta =
    overview.avgScorePercentPrior !== null && overview.avgScorePercentRecent !== null
      ? Math.round(overview.avgScorePercentRecent - overview.avgScorePercentPrior)
      : null;

  const trendData = trend.map((t) => ({
    week: new Date(t.weekStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    avgScorePercent: t.avgScorePercent ?? 0,
  }));

  const subjectData = subjects.slice(0, 8).map((s, i) => ({
    name: hi ? s.subjectNameHi : s.subjectNameEn,
    accuracyPercent: s.accuracyPercent ?? 0,
    color: categoricalColor(i),
  }));

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black text-navy-900">{L('प्रदर्शन रिपोर्ट', 'Performance reports')}</h2>
        <Link href={p('/admin/reports')} className="rounded-md border border-line px-3 py-1.5 text-xs font-extrabold text-navy-900 hover:bg-surface-soft">
          {L('विस्तृत रिपोर्ट देखें', 'View detailed reports')} →
        </Link>
      </div>

      {/* KPI strip */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={L('मूल्यांकित छात्र', 'Students assessed')} value={overview.totalStudentsAssessed} />
        <StatTile
          label={L('औसत स्कोर', 'Average score')}
          value={<Pct value={overview.avgScorePercent} />}
          trend={recentDelta}
          trendSuffix="pt"
        />
        <StatTile label={L('उत्तीर्ण दर', 'Pass rate')} value={<Pct value={overview.passRatePercent} />} valueClassName={overview.passRatePercent !== null && overview.passRatePercent < 50 ? 'text-danger' : 'text-success'} />
        <StatTile label={L('कुल प्रयास', 'Total attempts')} value={overview.totalAttempts} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* Score trend */}
        <ChartCard title={L('स्कोर रुझान (12 सप्ताह)', 'Score trend (12 weeks)')}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dfe8ee" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#607286' }} axisLine={{ stroke: '#dfe8ee' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#607286' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#dfe8ee' }} />
              <Line type="monotone" dataKey="avgScorePercent" name={L('औसत स्कोर', 'Avg score')} stroke={BRAND_SERIES.teal} strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Subject-wise accuracy */}
        <ChartCard title={L('विषय-वार सटीकता', 'Subject-wise accuracy')}>
          {subjectData.length === 0 ? (
            <p className="text-xs text-muted">{L('अभी कोई डेटा नहीं।', 'No data yet.')}</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dfe8ee" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#607286' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: '#102235' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                <Bar dataKey="accuracyPercent" name={L('सटीकता', 'Accuracy')} radius={[0, 4, 4, 0]}>
                  {subjectData.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Institution leaderboard (Super Admin) */}
      {institutionLeaderboard ? (
        <Card className="mt-4">
          <h3 className="mb-3 text-sm font-extrabold text-navy-900">{L('संस्थान लीडरबोर्ड', 'Institution leaderboard')}</h3>
          {institutionLeaderboard.length === 0 ? (
            <p className="text-xs text-muted">{L('अभी कोई डेटा नहीं।', 'No data yet.')}</p>
          ) : (
            <div className="grid gap-1.5">
              {institutionLeaderboard.slice(0, 10).map((row, i) => (
                <Link
                  key={row.orgId}
                  href={p(`/admin/organizations/${row.orgId}`)}
                  className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-xs hover:bg-surface-soft"
                >
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold text-white" style={{ background: categoricalColor(i) }}>
                      {i + 1}
                    </span>
                    <span className="font-bold text-ink">{row.orgName}</span>
                    <span className="text-muted">· {row.studentsAssessed} {L('छात्र', 'students')}</span>
                  </span>
                  <span className="font-extrabold text-navy-900">
                    <Pct value={row.avgScorePercent} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {/* Student leaderboard (Institution) */}
      {studentLeaderboard ? (
        <Card className="mt-4">
          <h3 className="mb-3 text-sm font-extrabold text-navy-900">{L('छात्र लीडरबोर्ड', 'Student leaderboard')}</h3>
          {studentLeaderboard.length === 0 ? (
            <p className="text-xs text-muted">{L('अभी कोई डेटा नहीं।', 'No data yet.')}</p>
          ) : (
            <div className="grid gap-1.5">
              {studentLeaderboard.slice(0, 10).map((row, i) => (
                <Link
                  key={row.studentId}
                  href={p(`/admin/reports/student/${row.studentId}`)}
                  className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-xs hover:bg-surface-soft"
                >
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold text-white" style={{ background: categoricalColor(i) }}>
                      {i + 1}
                    </span>
                    <span className="font-bold text-ink">{row.name}</span>
                    <span className="text-muted">· {row.totalAttempts} {L('प्रयास', 'attempts')}</span>
                  </span>
                  <span className="font-extrabold text-navy-900">
                    <Pct value={row.avgScorePercent} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      ) : null}
    </section>
  );
}
