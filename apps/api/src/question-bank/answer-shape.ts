import { AppError } from '../common/errors/app-error';

type Opt = { key: string; hi?: string; en?: string };

function optionKeys(options: unknown): Set<string> {
  if (!Array.isArray(options)) return new Set();
  return new Set((options as Opt[]).map((o) => String(o.key)));
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') return [v];
  return [];
}

/**
 * Validate that correctAnswer is well-formed for the question type and that
 * choice keys exist among the options. Throws AppError on invalid input — used
 * before insertion (create/import) so bad data never lands in the bank.
 */
export function validateAnswerShape(type: string, options: unknown, correctAnswer: unknown): void {
  const keys = optionKeys(options);
  const bad = (m: string) => {
    throw AppError.conflict(m);
  };

  switch (type) {
    case 'SINGLE_CHOICE':
    case 'PASSAGE':
    case 'ASSERTION_REASON': {
      const ans = asStringArray(correctAnswer);
      if (ans.length !== 1) bad('Single-answer question needs exactly one correct key.');
      if (keys.size && !ans.every((k) => keys.has(k))) bad('Correct key not among options.');
      return;
    }
    case 'MULTIPLE_CHOICE': {
      const ans = asStringArray(correctAnswer);
      if (ans.length < 1) bad('Multiple-choice needs at least one correct key.');
      if (keys.size && !ans.every((k) => keys.has(k))) bad('Correct key not among options.');
      return;
    }
    case 'TRUE_FALSE': {
      const ans = asStringArray(correctAnswer).map((s) => s.toUpperCase());
      if (ans.length !== 1 || !['TRUE', 'FALSE'].includes(ans[0]!)) bad('True/False answer must be TRUE or FALSE.');
      return;
    }
    case 'NUMERIC': {
      const a = correctAnswer as { value?: unknown; tolerance?: unknown };
      if (!a || typeof a.value !== 'number') bad('Numeric answer needs a numeric value.');
      return;
    }
    case 'MATCH': {
      if (!Array.isArray(correctAnswer) || correctAnswer.length === 0) bad('Match needs answer pairs.');
      return;
    }
    default:
      bad(`Unsupported question type: ${type}`);
  }
}

/** Server-side correctness check for scoring. Never runs on the client. */
export function isResponseCorrect(type: string, correctAnswer: unknown, response: unknown): boolean {
  if (response === null || response === undefined) return false;
  switch (type) {
    case 'SINGLE_CHOICE':
    case 'PASSAGE':
    case 'ASSERTION_REASON':
    case 'MULTIPLE_CHOICE': {
      const correct = new Set(asStringArray(correctAnswer));
      const given = new Set(asStringArray(response));
      return correct.size === given.size && [...correct].every((k) => given.has(k));
    }
    case 'TRUE_FALSE': {
      const c = asStringArray(correctAnswer)[0]?.toUpperCase();
      const g = asStringArray(response)[0]?.toUpperCase();
      return Boolean(c && g && c === g);
    }
    case 'NUMERIC': {
      const a = correctAnswer as { value: number; tolerance?: number };
      const r = typeof response === 'number' ? response : Number((response as { value?: unknown })?.value ?? response);
      if (Number.isNaN(r)) return false;
      return Math.abs(r - a.value) <= (a.tolerance ?? 0);
    }
    case 'MATCH': {
      const correct = correctAnswer as { left: string; right: string }[];
      const given = (Array.isArray(response) ? response : []) as { left: string; right: string }[];
      if (given.length !== correct.length) return false;
      return correct.every((p) => given.some((g) => g.left === p.left && g.right === p.right));
    }
    default:
      return false;
  }
}
