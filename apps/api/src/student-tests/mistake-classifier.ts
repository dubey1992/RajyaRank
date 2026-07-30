import type { MistakeType } from '@rajyarank/contracts';

/** Prior attemptsCount required on a concept before its accuracy is trusted as
 *  "established" rather than a small/lucky/unlucky sample. */
export const MIN_MASTERY_HISTORY = 5;
/** Matches the existing <50% "danger" convention used elsewhere (dashboard,
 *  StudyPlanWeekView) for what counts as a weak area. */
export const WEAK_ACCURACY_THRESHOLD = 50;
/** > 1.5x the test's flat average per-question time counts as slow. */
export const SLOW_MULTIPLIER = 1.5;
/** < 0.25x the test's flat average per-question time is implausibly fast for
 *  genuine engagement with the question. */
export const FAST_MULTIPLIER = 0.25;

/**
 * Classifies a single wrong answer into a mistake type, using only signals
 * that actually exist in this codebase: the question's linked concepts, the
 * student's PRE-submission mastery on each (never including this attempt —
 * callers must read StudentConceptMastery before mutating it), and how long
 * the student spent on the question relative to the test's flat average pace.
 *
 * Precedence: CONCEPT_GAP > SLOW_CALCULATION > GUESSING > MISREAD. A real
 * accuracy pattern across >= MIN_MASTERY_HISTORY prior tries is the least
 * noisy signal available, so it wins even when timing also looks "slow" —
 * grinding slowly through something you don't understand is consistent with
 * a concept gap, not a competing explanation.
 *
 * MISREAD is a residual, process-of-elimination bucket ("normal pace, no
 * established concept-weakness") — not a positively-detected signal. A
 * question with no linked concept never forces CONCEPT_GAP; it simply falls
 * through to the timing checks, which are independent of concept coverage.
 */
export function classifyMistake(input: {
  timeSpentMs: number;
  concepts: string[];
  preMasteryByConcept: Map<string, { attemptsCount: number; correctCount: number }>;
  /** 0 disables both timing checks (e.g. a malformed/zero-question test). */
  parTimeMs: number;
}): MistakeType {
  const establishedWeak = input.concepts.some((conceptId) => {
    const m = input.preMasteryByConcept.get(conceptId);
    if (!m || m.attemptsCount < MIN_MASTERY_HISTORY) return false;
    return (m.correctCount / m.attemptsCount) * 100 < WEAK_ACCURACY_THRESHOLD;
  });
  if (establishedWeak) return 'CONCEPT_GAP';

  if (input.parTimeMs > 0) {
    if (input.timeSpentMs > input.parTimeMs * SLOW_MULTIPLIER) return 'SLOW_CALCULATION';
    if (input.timeSpentMs < input.parTimeMs * FAST_MULTIPLIER) return 'GUESSING';
  }

  return 'MISREAD';
}
