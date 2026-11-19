import type { SubjectPerformanceRow } from '@rajyarank/contracts';
import { Card, categoricalColor } from '@rajyarank/ui';
import type { Locale } from '@/lib/i18n';

/** Full subject table (the dashboard card's chart only shows the top 8 bars)
 *  — a colored accuracy bar per row, same categorical palette as the chart
 *  above it so a subject's color stays consistent between the two views. */
export function SubjectPerformanceTable({ subjects, locale }: { subjects: SubjectPerformanceRow[]; locale: Locale }) {
  const hi = locale === 'hi';
  if (subjects.length === 0) return null;
  return (
    <Card className="mt-4">
      <h3 className="mb-3 text-sm font-extrabold text-navy-900">{hi ? 'सभी विषय' : 'All subjects'}</h3>
      <div className="grid gap-2">
        {subjects.map((s, i) => {
          const color = categoricalColor(i);
          const pct = s.accuracyPercent ?? 0;
          return (
            <div key={s.subjectId} className="grid grid-cols-[1fr_auto] items-center gap-3 text-xs">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-bold text-ink">{hi ? s.subjectNameHi : s.subjectNameEn}</span>
                  <span className="text-muted">{s.attemptCount} {hi ? 'प्रश्न' : 'questions'}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-soft">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
              <span className="w-12 text-right font-extrabold text-navy-900">{s.accuracyPercent === null ? '—' : `${s.accuracyPercent}%`}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
