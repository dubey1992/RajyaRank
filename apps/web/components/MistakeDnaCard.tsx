'use client';
import { useState } from 'react';
import type { MistakeDnaView, MistakeType, PlanItemView } from '@rajyarank/contracts';

// `bar` = solid fill color for the DNA breakdown bars (same convention as the
// dashboard's weak-topics bars, which also fill with solid danger/warning/teal).
// `badge` = light-tint background + colored text, matching the house pill
// convention used elsewhere (e.g. StudyPlanWeekView's "Focus area" pill) —
// deliberately NOT the same solid-bg+white-text style as the bars.
const TYPE_LABEL: Record<MistakeType, { hi: string; en: string; bar: string; badge: string }> = {
  CONCEPT_GAP: { hi: 'कॉन्सेप्ट गैप', en: 'Concept gap', bar: 'bg-danger', badge: 'bg-[#fff1f2] text-danger' },
  SLOW_CALCULATION: { hi: 'धीमी गणना', en: 'Slow calculation', bar: 'bg-warning', badge: 'bg-orange-100 text-orange-600' },
  GUESSING: { hi: 'अंदाज़ा', en: 'Guessing', bar: 'bg-[#7c3aed]', badge: 'bg-[#f1e9ff] text-[#7c3aed]' },
  MISREAD: { hi: 'गलत पढ़ाई', en: 'Misread', bar: 'bg-teal-600', badge: 'bg-teal-100 text-teal-600' },
};

export function MistakeDnaCard({
  dna,
  coachItems,
  locale,
}: {
  dna: MistakeDnaView;
  coachItems: (PlanItemView & { date: string })[];
  locale: string;
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [open, setOpen] = useState(false);

  if (!dna.available) {
    return (
      <article className="rounded-[20px] border border-line bg-white p-5 text-center shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
        <h3 className="text-base font-black tracking-tight text-navy-950">{L('मिस्टेक डीएनए', 'Mistake DNA')}</h3>
        <p className="mt-2 text-[11px] text-muted">{L('कुछ टेस्ट देने के बाद आपके ग़लतियों का पैटर्न यहाँ दिखेगा।', 'Take a few tests and your mistake pattern will show up here.')}</p>
      </article>
    );
  }

  const { byType, totalWrong, windowDays } = dna;

  return (
    <>
      <article className="rounded-[20px] border border-line bg-white p-5 shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
        <div className="mb-3 text-left">
          <h3 className="text-base font-black tracking-tight text-navy-950">{L('मिस्टेक डीएनए', 'Mistake DNA')}</h3>
          <p className="text-[11px] text-muted">{L(`पिछले ${windowDays} दिनों की ${totalWrong} ग़लतियाँ`, `Your last ${totalWrong} mistakes over ${windowDays} days`)}</p>
        </div>
        <div className="grid gap-2.5">
          {byType.map((t) => (
            <div key={t.type}>
              <div className="flex items-center justify-between text-[11.5px]">
                <strong>{hi ? TYPE_LABEL[t.type].hi : TYPE_LABEL[t.type].en}</strong>
                <small className="text-muted">{t.count} · {t.percent}%</small>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                <span className={`block h-full rounded-full ${TYPE_LABEL[t.type].bar}`} style={{ width: `${t.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setOpen(true)} className="mt-3 text-[11px] font-black text-orange-600 hover:underline">
          {L('3-दिन का मिस्टेक कोच →', '3-day Mistake Coach →')}
        </button>
      </article>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-base font-black text-navy-900">{L('आपका मिस्टेक कोच प्लान', 'Your Mistake Coach plan')}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label={L('बंद करें', 'Close')} className="text-muted hover:text-ink">✕</button>
            </div>
            {coachItems.length === 0 ? (
              <p className="text-[11px] text-muted">{L('अभी कोई ड्रिल शेड्यूल नहीं। अधिक टेस्ट देने के बाद यह सक्रिय होगा।', 'No drills scheduled yet — this activates once there is enough mistake history.')}</p>
            ) : (
              <div className="grid gap-2.5">
                {coachItems.map((item) => (
                  <div key={item.id} className="rounded-md border border-line p-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-navy-900">{hi ? item.titleHi : item.titleEn}</span>
                      <span className="text-[10px] text-muted">{item.date}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      {item.triggerMistakeType ? (
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${TYPE_LABEL[item.triggerMistakeType].badge}`}>
                          {hi ? TYPE_LABEL[item.triggerMistakeType].hi : TYPE_LABEL[item.triggerMistakeType].en}
                        </span>
                      ) : <span />}
                      <span className="text-[10px] text-muted">{item.estimatedMinutes} {L('मिनट', 'min')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
