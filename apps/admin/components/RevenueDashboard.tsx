'use client';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Locale } from '@/lib/i18n';

export interface RevenueOverview {
  totalRevenueMinor: number;
  thisMonthRevenueMinor: number;
  lastMonthRevenueMinor: number;
  activeInstitutionSubs: number;
  activeStudentPlans: number;
  overdueInvoiceCount: number;
  monthly: { month: string; studentRevenueMinor: number; institutionRevenueMinor: number }[];
  institutionPlanMix: { nameEn: string; count: number }[];
  studentPlanMix: { titleEn: string; count: number }[];
  needsAttention: {
    stalledTrials: { orgId: string; orgName: string; planNameEn: string; sinceDays: number }[];
    overdueInvoices: { id: string; invoiceNumber: string; orgName: string; amountMinor: number; dueAt: string }[];
    unpaidOrders: { id: string; buyer: string; product: string; amountMinor: number; createdAt: string }[];
  };
}

const STUDENT_COLOR = '#f97316'; // orange-500
const INSTITUTION_COLOR = '#0b2f4f'; // navy-900

function rupees(minor: number) {
  return `₹${(minor / 100).toLocaleString('en-IN')}`;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line bg-white px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-extrabold text-navy-900">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <strong>{rupees(p.value)}</strong>
        </div>
      ))}
    </div>
  );
}

/** Super Admin revenue dashboard: combined student + institution direct
 *  revenue (deliberately excludes marketplace commission, shown separately
 *  in the existing Platform Finance card), trend, plan mix, and a
 *  needs-attention list surfacing exactly the kind of stuck payment that
 *  used to require noticing it was missing. */
export function RevenueDashboard({ data, locale }: { data: RevenueOverview; locale: Locale }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const p = (path: string) => `/${locale}${path}`;

  const monthDelta =
    data.lastMonthRevenueMinor > 0
      ? Math.round(((data.thisMonthRevenueMinor - data.lastMonthRevenueMinor) / data.lastMonthRevenueMinor) * 100)
      : null;

  const attentionCount =
    data.needsAttention.stalledTrials.length + data.needsAttention.overdueInvoices.length + data.needsAttention.unpaidOrders.length;

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black text-navy-900">{L('राजस्व', 'Revenue')}</h2>
        <div className="flex gap-2">
          <Link href={p('/admin/payments')} className="rounded-md border border-line px-3 py-1.5 text-xs font-extrabold text-navy-900 hover:bg-surface-soft">
            {L('छात्र भुगतान', 'Student payments')}
          </Link>
          <Link href={p('/admin/billing/plans?tab=billing')} className="rounded-md border border-line px-3 py-1.5 text-xs font-extrabold text-navy-900 hover:bg-surface-soft">
            {L('संस्थान बिलिंग', 'Institution billing')}
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{L('कुल राजस्व', 'Total revenue')}</div>
          <div className="mt-1 text-2xl font-black text-success">{rupees(data.totalRevenueMinor)}</div>
          <div className="text-xs text-muted">{L('छात्र + संस्थान', 'Student + institution')}</div>
        </div>
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{L('इस माह', 'This month')}</div>
          <div className="mt-1 text-2xl font-black text-navy-950">{rupees(data.thisMonthRevenueMinor)}</div>
          {monthDelta !== null ? (
            <div className={`text-xs font-bold ${monthDelta >= 0 ? 'text-success' : 'text-danger'}`}>
              {monthDelta >= 0 ? '▲' : '▼'} {Math.abs(monthDelta)}% {L('पिछले माह से', 'vs last month')}
            </div>
          ) : (
            <div className="text-xs text-muted">{L('पिछला माह डेटा नहीं', 'No prior-month data')}</div>
          )}
        </div>
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{L('सक्रिय संस्थान योजनाएँ', 'Active institution plans')}</div>
          <div className="mt-1 text-2xl font-black text-navy-950">{data.activeInstitutionSubs}</div>
        </div>
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{L('सक्रिय छात्र योजनाएँ', 'Active student plans')}</div>
          <div className="mt-1 text-2xl font-black text-navy-950">{data.activeStudentPlans}</div>
        </div>
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{L('ध्यान देने योग्य', 'Needs attention')}</div>
          <div className={`mt-1 text-2xl font-black ${attentionCount > 0 ? 'text-warning' : 'text-navy-950'}`}>{attentionCount}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* Monthly trend */}
        <div className="rounded-lg border border-line bg-white p-4">
          <h3 className="mb-3 text-sm font-extrabold text-navy-900">{L('मासिक रुझान (12 माह)', 'Monthly trend (12 months)')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dfe8ee" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#607286' }} axisLine={{ stroke: '#dfe8ee' }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#607286' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `₹${v >= 100000 ? `${Math.round(v / 100000)}L` : v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="studentRevenueMinor" name={L('छात्र', 'Student')} stackId="rev" fill={STUDENT_COLOR} radius={[0, 0, 0, 0]} />
                <Bar dataKey="institutionRevenueMinor" name={L('संस्थान', 'Institution')} stackId="rev" fill={INSTITUTION_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan mix */}
        <div className="grid gap-4">
          <div className="rounded-lg border border-line bg-white p-4">
            <h3 className="mb-2 text-sm font-extrabold text-navy-900">{L('संस्थान योजना मिश्रण', 'Institution plan mix')}</h3>
            {data.institutionPlanMix.length === 0 ? (
              <p className="text-xs text-muted">{L('कोई सक्रिय संस्थान योजना नहीं।', 'No active institution plans.')}</p>
            ) : (
              <div className="grid gap-1.5">
                {data.institutionPlanMix.map((m) => (
                  <div key={m.nameEn} className="flex items-center justify-between text-xs">
                    <span className="text-ink">{m.nameEn}</span>
                    <span className="font-extrabold text-navy-900">{m.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-lg border border-line bg-white p-4">
            <h3 className="mb-2 text-sm font-extrabold text-navy-900">{L('छात्र योजना मिश्रण', 'Student plan mix')}</h3>
            {data.studentPlanMix.length === 0 ? (
              <p className="text-xs text-muted">{L('कोई सक्रिय छात्र योजना नहीं।', 'No active student plans.')}</p>
            ) : (
              <div className="grid gap-1.5">
                {data.studentPlanMix.map((m) => (
                  <div key={m.titleEn} className="flex items-center justify-between text-xs">
                    <span className="text-ink">{m.titleEn}</span>
                    <span className="font-extrabold text-navy-900">{m.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Needs attention */}
      {attentionCount > 0 ? (
        <div className="mt-4 rounded-lg border border-warning/30 bg-white p-4">
          <h3 className="mb-3 text-sm font-extrabold text-navy-900">{L('ध्यान देने योग्य भुगतान', 'Payments needing attention')}</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {data.needsAttention.stalledTrials.length ? (
              <div>
                <div className="mb-1.5 text-[11px] font-extrabold uppercase text-warning">{L('अटका हुआ चेकआउट', 'Stalled checkout')}</div>
                <div className="grid gap-1">
                  {data.needsAttention.stalledTrials.map((t) => (
                    <Link key={t.orgId} href={p('/admin/billing/plans?tab=billing')} className="rounded-md border border-line px-2 py-1.5 text-xs hover:bg-surface-soft">
                      <div className="font-bold text-ink">{t.orgName}</div>
                      <div className="text-muted">{t.planNameEn} · {t.sinceDays}{L('द', 'd')}</div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            {data.needsAttention.overdueInvoices.length ? (
              <div>
                <div className="mb-1.5 text-[11px] font-extrabold uppercase text-danger">{L('अतिदेय चालान', 'Overdue invoices')}</div>
                <div className="grid gap-1">
                  {data.needsAttention.overdueInvoices.map((i) => (
                    <Link key={i.id} href={p('/admin/billing/plans?tab=billing')} className="rounded-md border border-line px-2 py-1.5 text-xs hover:bg-surface-soft">
                      <div className="font-bold text-ink">{i.orgName}</div>
                      <div className="text-muted">{i.invoiceNumber} · {rupees(i.amountMinor)}</div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            {data.needsAttention.unpaidOrders.length ? (
              <div>
                <div className="mb-1.5 text-[11px] font-extrabold uppercase text-muted">{L('अवैतनिक ऑर्डर', 'Unpaid orders')}</div>
                <div className="grid gap-1">
                  {data.needsAttention.unpaidOrders.map((o) => (
                    <Link key={o.id} href={p('/admin/payments')} className="rounded-md border border-line px-2 py-1.5 text-xs hover:bg-surface-soft">
                      <div className="font-bold text-ink">{o.buyer}</div>
                      <div className="text-muted">{o.product} · {rupees(o.amountMinor)}</div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
