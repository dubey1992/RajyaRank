import type { Locale } from '@/lib/i18n';
import type { LiveClassEngagementRow } from '@rajyarank/contracts';

/** Live Classes engagement — attendance rate and average duration across the
 *  most recent ended classes in scope. Same bespoke inline-div convention as
 *  AnalyticsCards.tsx (no shared Card/StatTile primitive exists yet). */
export function LiveClassEngagementCards({ rows, locale }: { rows: LiveClassEngagementRow[]; locale: Locale }) {
  const hi = locale === 'hi';

  if (rows.length === 0) {
    return (
      <div className="mb-6 rounded-lg border border-line bg-white p-4 text-sm text-muted">
        {hi ? 'अभी कोई समाप्त लाइव क्लास नहीं है।' : 'No ended live classes yet.'}
      </div>
    );
  }

  const rates = rows.map((r) => r.attendanceRatePercent).filter((r): r is number => r !== null);
  const avgRate = rates.length ? Math.round(rates.reduce((s, r) => s + r, 0) / rates.length) : null;
  const durations = rows.map((r) => r.avgDurationMinutes).filter((d): d is number => d !== null);
  const avgDuration = durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : null;

  return (
    <div className="mb-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{hi ? 'औसत उपस्थिति दर' : 'Avg attendance rate'}</div>
          <div className="mt-1 text-2xl font-black text-navy-900">{avgRate !== null ? `${avgRate}%` : '—'}</div>
          <div className="text-xs text-muted">{rows.length} {hi ? 'हाल की क्लासेस' : 'recent classes'}</div>
        </div>
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{hi ? 'औसत अवधि' : 'Avg duration'}</div>
          <div className="mt-1 text-2xl font-black text-navy-900">{avgDuration !== null ? `${avgDuration} ${hi ? 'मिनट' : 'min'}` : '—'}</div>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-extrabold uppercase text-muted">
              <th className="px-4 py-2">{hi ? 'क्लास' : 'Class'}</th>
              <th className="px-4 py-2">{hi ? 'तारीख' : 'Date'}</th>
              <th className="px-4 py-2">{hi ? 'उपस्थित / पात्र' : 'Attended / Entitled'}</th>
              <th className="px-4 py-2">{hi ? 'दर' : 'Rate'}</th>
              <th className="px-4 py-2">{hi ? 'औसत अवधि' : 'Avg duration'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2 font-bold text-ink">{hi ? r.titleHi : r.titleEn}</td>
                <td className="px-4 py-2 text-muted">{new Date(r.startsAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                <td className="px-4 py-2 text-muted">{r.attendeeCount} / {r.entitledCount}</td>
                <td className="px-4 py-2 font-bold text-navy-900">{r.attendanceRatePercent !== null ? `${r.attendanceRatePercent}%` : '—'}</td>
                <td className="px-4 py-2 text-muted">{r.avgDurationMinutes !== null ? `${r.avgDurationMinutes} ${hi ? 'मिनट' : 'min'}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
