/** Student & Institution Performance Reports — org-scoped for Academic Head,
 *  platform-wide for Super Admin. Backed by the incrementally-upserted
 *  StudentPerformanceSnapshot/StudentSubjectPerformance rollups, never a live
 *  loop over raw Attempt/AttemptAnswer rows. */
export interface PerformanceOverview {
  totalStudentsAssessed: number;
  totalAttempts: number;
  /** Lifetime average across every attempt in scope. */
  avgScorePercent: number | null;
  passRatePercent: number | null;
  /** Last 7 days vs. the 7 days before that — what the dashboard's trend
   *  arrow (▲/▼) compares, independent of the lifetime avgScorePercent above. */
  avgScorePercentRecent: number | null;
  avgScorePercentPrior: number | null;
}

export interface PerformanceTrendPoint {
  weekStart: string;
  avgScorePercent: number | null;
  attempts: number;
}

export interface SubjectPerformanceRow {
  subjectId: string;
  subjectNameEn: string;
  subjectNameHi: string;
  accuracyPercent: number | null;
  attemptCount: number;
}

export interface InstitutionLeaderboardRow {
  orgId: string;
  orgName: string;
  studentsAssessed: number;
  avgScorePercent: number | null;
  totalAttempts: number;
}

export interface StudentLeaderboardRow {
  studentId: string;
  name: string;
  avgScorePercent: number | null;
  totalAttempts: number;
  lastAttemptAt: string | null;
}

export interface StudentPerformanceDetail {
  studentId: string;
  name: string;
  avgScorePercent: number | null;
  totalAttempts: number;
  recentAttempts: { attemptId: string; testTitleEn: string; scorePercent: number | null; submittedAt: string | null }[];
  subjects: SubjectPerformanceRow[];
  weakConcepts: { conceptId: string; conceptNameEn: string; accuracyPercent: number | null; attemptsCount: number }[];
}
