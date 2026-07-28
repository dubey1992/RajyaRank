'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { ReadinessView } from '@rajyarank/contracts';

const CIRC = 2 * Math.PI * 54;

export function ReadinessGauge({ readiness, locale }: { readiness: ReadinessView; locale: string }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [open, setOpen] = useState(false);

  if (!readiness.available) {
    return (
      <article className="rounded-[20px] border border-line bg-white p-5 text-center shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
        <h3 className="text-base font-black tracking-tight text-navy-950">{L('परीक्षा तैयारी स्कोर', 'Exam readiness score')}</h3>
        {readiness.reason === 'ONBOARDING_INCOMPLETE' ? (
          <>
            <p className="mt-2 text-[11px] text-muted">{L('लक्ष्य परीक्षा सेट करने के बाद आपका स्कोर यहाँ दिखेगा।', 'Set your target exam to see your readiness score here.')}</p>
            <Link href={`/${locale}/account`} className="mt-3 inline-flex text-[11px] font-black text-orange-600">{L('लक्ष्य सेट करें →', 'Set target →')}</Link>
          </>
        ) : (
          <p className="mt-2 text-[11px] text-muted">{L('आपकी परीक्षा के लिए अभी यह उपलब्ध नहीं है।', "Not yet available for your exam.")}</p>
        )}
      </article>
    );
  }

  const { score, breakdown } = readiness;
  const rows: { key: keyof typeof breakdown; labelHi: string; labelEn: string; weight: number; descHi: string; descEn: string }[] = [
    { key: 'conceptMastery', labelHi: 'कॉन्सेप्ट मास्टरी', labelEn: 'Concept mastery', weight: 35, descHi: 'मैप किए गए कॉन्सेप्ट में सटीकता', descEn: 'Accuracy across mapped concepts' },
    { key: 'syllabusCoverage', labelHi: 'सिलेबस कवरेज', labelEn: 'Syllabus coverage', weight: 20, descHi: 'पढ़े व जाँचे गए आवश्यक कॉन्सेप्ट', descEn: 'Required concepts studied and assessed' },
    { key: 'revisionRetention', labelHi: 'रिवीज़न रिटेंशन', labelEn: 'Revision retention', weight: 20, descHi: 'हाल में दोहराए गए कॉन्सेप्ट', descEn: 'Concepts revisited recently' },
    { key: 'testEfficiency', labelHi: 'टेस्ट दक्षता', labelEn: 'Test efficiency', weight: 15, descHi: 'आपकी लक्ष्य परीक्षा के टेस्ट में औसत स्कोर', descEn: 'Average score across your target exam’s tests' },
    { key: 'consistency', labelHi: 'निरंतरता', labelEn: 'Consistency', weight: 10, descHi: 'पिछले 7 दिनों में सक्रियता', descEn: 'Activity over the last 7 days' },
  ];

  return (
    <>
      <article className="rounded-[20px] border border-line bg-white p-5 text-center shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
        <div className="mb-1 text-left">
          <h3 className="text-base font-black tracking-tight text-navy-950">{L('परीक्षा तैयारी स्कोर', 'Exam readiness score')}</h3>
          <p className="text-[11px] text-muted">{L('तैयारी का प्रमाण — चयन/रैंक की भविष्यवाणी नहीं', 'Preparation evidence — not a selection/rank prediction')}</p>
        </div>
        <div className="relative mx-auto my-3 h-[146px] w-[146px]">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r="54" fill="none" strokeWidth="11" stroke="#edf3f6" />
            <circle cx="60" cy="60" r="54" fill="none" strokeWidth="11" strokeLinecap="round" stroke="#0ea58a" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - score / 100)} />
          </svg>
          <div className="absolute inset-0 grid place-content-center">
            <strong className="text-[31px] font-black tracking-tighter text-navy-950">{score}%</strong>
            <span className="text-[9.5px] font-black text-muted">{L('रेडी', 'READY')}</span>
          </div>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="text-[11px] font-black text-orange-600 hover:underline">
          {L('यह कैसे गणना होती है? →', 'How is this calculated? →')}
        </button>
      </article>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-base font-black text-navy-900">{L('तैयारी स्कोर की गणना', 'How your readiness score is calculated')}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label={L('बंद करें', 'Close')} className="text-muted hover:text-ink">✕</button>
            </div>
            <div className="grid gap-2.5">
              {rows.map((r) => (
                <div key={r.key} className="rounded-md border border-line p-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-navy-900">{hi ? r.labelHi : r.labelEn} · {r.weight}%</span>
                    <span className="font-black text-teal-600">{breakdown[r.key]}%</span>
                  </div>
                  <p className="mt-1 text-[10.5px] text-muted">{hi ? r.descHi : r.descEn}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-md border border-[#d8e6ff] bg-[#edf4ff] p-3 text-[10.5px] leading-relaxed text-[#285b9e]">
              {L(
                'महत्वपूर्ण: यह RajyaRank के भीतर आपकी तैयारी का प्रमाण मापता है। यह चयन, रैंक, कट-ऑफ या परीक्षा परिणाम की भविष्यवाणी नहीं करता।',
                'Important: this measures your preparation evidence inside RajyaRank. It does not predict selection, rank, cut-off, or exam outcome.',
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
