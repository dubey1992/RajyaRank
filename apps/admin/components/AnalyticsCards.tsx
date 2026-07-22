import type { Locale } from '@/lib/i18n';

export interface Overview {
  students: number;
  activeStudents: number;
  staff: number;
  publishedLessons: number;
  pendingReview: number;
  attempts: number;
  completedAttempts: number;
  revenueMinor: number;
  paidOrders: number;
  openDoubts: number;
  openTickets: number;
}

/** Product/academic/ops stat cards for the admin dashboard (PRD §22). */
export function AnalyticsCards({ data, locale }: { data: Overview; locale: Locale }) {
  const hi = locale === 'hi';
  const inr = new Intl.NumberFormat(hi ? 'hi-IN' : 'en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const cards: { label: string; value: string; sub?: string; tone: string }[] = [
    { label: hi ? 'सक्रिय छात्र' : 'Active students', value: String(data.activeStudents), sub: `${data.students} ${hi ? 'कुल' : 'total'}`, tone: 'text-navy-900' },
    { label: hi ? 'स्टाफ़' : 'Staff', value: String(data.staff), tone: 'text-navy-900' },
    { label: hi ? 'प्रकाशित पाठ' : 'Published lessons', value: String(data.publishedLessons), tone: 'text-success' },
    { label: hi ? 'समीक्षा हेतु लंबित' : 'Pending review', value: String(data.pendingReview), tone: 'text-warning' },
    { label: hi ? 'टेस्ट प्रयास' : 'Test attempts', value: String(data.attempts), sub: `${data.completedAttempts} ${hi ? 'पूर्ण' : 'completed'}`, tone: 'text-navy-900' },
    { label: hi ? 'राजस्व' : 'Revenue', value: inr.format(data.revenueMinor / 100), sub: `${data.paidOrders} ${hi ? 'भुगतान' : 'paid orders'}`, tone: 'text-success' },
    { label: hi ? 'खुले संदेह' : 'Open doubts', value: String(data.openDoubts), tone: 'text-navy-900' },
    { label: hi ? 'खुले टिकट' : 'Open tickets', value: String(data.openTickets), tone: 'text-navy-900' },
  ];
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-line bg-white p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{c.label}</div>
          <div className={`mt-1 text-2xl font-black ${c.tone}`}>{c.value}</div>
          {c.sub ? <div className="text-xs text-muted">{c.sub}</div> : null}
        </div>
      ))}
    </div>
  );
}
