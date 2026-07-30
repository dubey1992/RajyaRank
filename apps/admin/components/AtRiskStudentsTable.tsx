import type { AtRiskFlag, AtRiskStudentView, MistakeType } from '@rajyarank/contracts';
import type { Locale } from '@/lib/i18n';

const RISK_TONE: Record<AtRiskStudentView['riskLevel'], string> = {
  HIGH: 'bg-[#fff1f2] text-danger',
  MEDIUM: 'bg-orange-100 text-orange-600',
  LOW: 'bg-teal-100 text-teal-600',
};

const FLAG_LABEL: Record<AtRiskFlag, { hi: string; en: string }> = {
  INACTIVE: { hi: 'निष्क्रिय', en: 'Inactive' },
  PLAN_BEHIND: { hi: 'योजना में पीछे', en: 'Behind plan' },
  SCORE_DECLINE: { hi: 'स्कोर में गिरावट', en: 'Score decline' },
  MISTAKE_CONCENTRATION: { hi: 'दोहराई जा रही ग़लती', en: 'Repeated mistake' },
};

const MISTAKE_LABEL: Record<MistakeType, { hi: string; en: string }> = {
  CONCEPT_GAP: { hi: 'कॉन्सेप्ट गैप', en: 'Concept gap' },
  MISREAD: { hi: 'गलत पढ़ाई', en: 'Misread' },
  SLOW_CALCULATION: { hi: 'धीमी गणना', en: 'Slow calculation' },
  GUESSING: { hi: 'अंदाज़ा', en: 'Guessing' },
};

export function AtRiskStudentsTable({ students, locale }: { students: AtRiskStudentView[]; locale: Locale }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  if (students.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-white p-6 text-center text-sm text-muted">
        {L('अभी कोई छात्र जोखिम में चिह्नित नहीं है।', 'No students are currently flagged at risk.')}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-soft text-xs font-extrabold uppercase text-muted">
            <th className="px-4 py-3">{L('छात्र', 'Student')}</th>
            <th className="px-4 py-3">{L('जोखिम', 'Risk')}</th>
            <th className="px-4 py-3">{L('कारण', 'Flags')}</th>
            <th className="px-4 py-3">{L('निष्क्रिय दिन', 'Inactive days')}</th>
            <th className="px-4 py-3">{L('योजना पालन', 'Plan adherence')}</th>
            <th className="px-4 py-3">{L('स्कोर रुझान', 'Score trend')}</th>
            <th className="px-4 py-3">{L('प्रमुख ग़लती', 'Dominant mistake')}</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.studentId} className="border-b border-line last:border-0">
              <td className="px-4 py-3">
                <div className="font-extrabold text-navy-900">{s.name || s.phone}</div>
                <div className="text-xs text-muted">{s.phone}</div>
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${RISK_TONE[s.riskLevel]}`}>{s.riskLevel}</span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {s.flags.map((f) => (
                    <span key={f} className="rounded-full bg-line px-2 py-0.5 text-[9.5px] font-bold text-ink">
                      {hi ? FLAG_LABEL[f].hi : FLAG_LABEL[f].en}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-xs">{s.inactiveDays}</td>
              <td className="px-4 py-3 text-xs">{s.planAdherencePercent != null ? `${s.planAdherencePercent}%` : '—'}</td>
              <td className="px-4 py-3 text-xs">
                {s.avgScoreRecentPercent != null && s.avgScorePriorPercent != null
                  ? `${s.avgScorePriorPercent}% → ${s.avgScoreRecentPercent}%`
                  : '—'}
              </td>
              <td className="px-4 py-3 text-xs">
                {s.dominantMistakeType ? (hi ? MISTAKE_LABEL[s.dominantMistakeType].hi : MISTAKE_LABEL[s.dominantMistakeType].en) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
