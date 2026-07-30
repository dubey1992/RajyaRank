import type { MistakeType } from './test';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type AtRiskFlag = 'INACTIVE' | 'PLAN_BEHIND' | 'SCORE_DECLINE' | 'MISTAKE_CONCENTRATION';

/** Institute Intervention Radar (Phase 3) — a pre-aggregated, explainable
 *  risk signal per student, org-scoped to the viewing staff member. */
export interface AtRiskStudentView {
  studentId: string;
  name: string;
  phone: string;
  riskLevel: RiskLevel;
  flags: AtRiskFlag[];
  inactiveDays: number;
  planAdherencePercent: number | null;
  avgScoreRecentPercent: number | null;
  avgScorePriorPercent: number | null;
  dominantMistakeType: MistakeType | null;
  computedAt: string;
}

/** Academic Head's institution snapshot — strictly scoped to their own org.
 *  Moved here from an ad hoc local interface in
 *  apps/admin/components/InstitutionOverviewCards.tsx so it's a shared,
 *  centrally-typed shape like every other admin response view. */
export interface InstitutionOverview {
  staff: number;
  students: number;
  courses: number;
  lessonsPublished: number;
  lessonsPendingReview: number;
  tests: number;
  openDoubts: number;
  openTickets: number;
}
