/** Single source of truth for chart hex values. Recharts (and most chart
 *  libraries) need raw color values, not Tailwind classes or CSS vars, so
 *  this mirrors tokens.css's palette as plain JS exports — RevenueDashboard
 *  previously hardcoded '#f97316'/'#0b2f4f' inline for exactly this reason;
 *  this file stops that duplicating a 2nd/3rd time as more charts are added. */

export const BRAND_SERIES = {
  navy: '#0b2f4f',
  orange: '#f97316',
  teal: '#0ea58a',
} as const;

/** 8-color qualitative palette for multi-series charts (subject-wise bars,
 *  institution comparisons, etc.) — the brand triad extended with hues
 *  chosen for pairwise distinguishability, not picked at random. Index order
 *  is stable: don't reorder, or re-renders will reshuffle which series gets
 *  which color across a session. */
export const CATEGORICAL_PALETTE: readonly string[] = [
  BRAND_SERIES.navy,
  BRAND_SERIES.orange,
  BRAND_SERIES.teal,
  '#6366f1', // indigo
  '#f43f5e', // rose
  '#d97706', // amber
  '#0891b2', // cyan
  '#7c3aed', // violet
];

export function categoricalColor(index: number): string {
  return CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length] ?? BRAND_SERIES.navy;
}

/** Semantic colors — same values as tokens.css's --rr-success/danger/warning,
 *  re-exported as hex for chart fills (pass/fail donuts, risk-level bars). */
export const SEMANTIC = {
  success: '#15803d',
  danger: '#be123c',
  warning: '#b45309',
} as const;
