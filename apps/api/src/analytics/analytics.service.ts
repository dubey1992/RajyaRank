import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type {
  AtRiskStudentView,
  RiskLevel,
  PerformanceOverview,
  PerformanceTrendPoint,
  SubjectPerformanceRow,
  InstitutionLeaderboardRow,
  StudentLeaderboardRow,
  StudentPerformanceDetail,
  LiveClassEngagementRow,
} from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../authz/authorization.service';
import { EntitlementService } from '../payments/entitlement.service';
import { AppError } from '../common/errors/app-error';

const RISK_RANK: Record<RiskLevel, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/** Aggregated product/academic/ops metrics for the admin dashboard.
 *  Read-only Prisma counts/aggregates — no raw data leaves the API. */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
    private readonly entitlements: EntitlementService,
  ) {}

  async overview() {
    const [
      students,
      activeStudents,
      staff,
      publishedLessons,
      pendingReview,
      attempts,
      completedAttempts,
      openDoubts,
      openTickets,
    ] = await Promise.all([
      this.prisma.user.count({ where: { kind: 'STUDENT', deletedAt: null } }),
      this.prisma.user.count({ where: { kind: 'STUDENT', status: 'ACTIVE', deletedAt: null } }),
      this.prisma.user.count({ where: { kind: 'STAFF', deletedAt: null } }),
      this.prisma.lessonVersion.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.lessonVersion.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
      this.prisma.attempt.count(),
      this.prisma.attempt.count({ where: { submittedAt: { not: null } } }),
      this.prisma.doubt.count({ where: { status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
      this.prisma.supportTicket.count({ where: { status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
    ]);

    return {
      students,
      activeStudents,
      staff,
      publishedLessons,
      pendingReview,
      attempts,
      completedAttempts,
      openDoubts,
      openTickets,
    };
  }

  /** Super Admin revenue dashboard — combines the two direct-sale revenue
   *  streams that nothing previously summed together: student Orders/Payments
   *  (course + subscription-plan purchases) and institution InstitutionInvoices
   *  (platform licence fees). Deliberately excludes marketplace commission
   *  (Transfer.platformFeeMinor, shown separately in the existing "Platform
   *  Finance" card) — that's RajyaRank's cut of an institution's OWN course
   *  sales, a different revenue mechanism, not money paid directly to
   *  RajyaRank the way these two streams are. */
  async revenueOverview() {
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const dayAgo = new Date(now.getTime() - 24 * 3_600_000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 3_600_000);

    const [
      allStudentPayments,
      allInstitutionInvoices,
      recentStudentPayments,
      recentInstitutionInvoices,
      activeInstitutionSubs,
      activeStudentPlans,
      overdueInvoiceCount,
      institutionPlanRows,
      studentPlanRows,
      stalledTrials,
      overdueInvoiceRows,
      unpaidOrderRows,
    ] = await Promise.all([
      this.prisma.payment.aggregate({ _sum: { amountMinor: true }, where: { status: 'PAID' } }),
      // Demo institutions are excluded from every institution-revenue query
      // below (via subscription.organization / organization.isDemo) — a
      // sales-demo's token invoices/subscriptions must never inflate real
      // revenue numbers or show up as a stalled-trial/overdue-invoice alert.
      this.prisma.institutionInvoice.aggregate({ _sum: { totalMinor: true }, where: { status: 'PAID', subscription: { organization: { isDemo: false } } } }),
      this.prisma.payment.findMany({ where: { status: 'PAID', paidAt: { gte: twelveMonthsAgo } }, select: { amountMinor: true, paidAt: true } }),
      this.prisma.institutionInvoice.findMany({ where: { status: 'PAID', paidAt: { gte: twelveMonthsAgo }, subscription: { organization: { isDemo: false } } }, select: { totalMinor: true, paidAt: true } }),
      this.prisma.organizationSubscription.count({ where: { status: 'ACTIVE', organization: { isDemo: false } } }),
      this.prisma.entitlement.count({ where: { status: 'ACTIVE', product: { kind: 'SUBSCRIPTION' }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] } }),
      this.prisma.institutionInvoice.count({ where: { status: 'OVERDUE', subscription: { organization: { isDemo: false } } } }),
      this.prisma.organizationSubscription.findMany({ where: { status: 'ACTIVE', organization: { isDemo: false } }, select: { plan: { select: { nameHi: true, nameEn: true } } } }),
      this.prisma.entitlement.findMany({
        where: { status: 'ACTIVE', product: { kind: 'SUBSCRIPTION' }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        select: { product: { select: { titleHi: true, titleEn: true } } },
      }),
      this.prisma.organizationSubscription.findMany({
        where: { status: 'TRIALING', createdAt: { lt: twoDaysAgo }, organization: { isDemo: false } },
        select: { orgId: true, createdAt: true, organization: { select: { name: true } }, plan: { select: { nameEn: true } } },
        orderBy: { createdAt: 'asc' },
        take: 10,
      }),
      this.prisma.institutionInvoice.findMany({
        where: { status: 'OVERDUE', subscription: { organization: { isDemo: false } } },
        select: { id: true, invoiceNumber: true, totalMinor: true, dueAt: true, subscription: { select: { organization: { select: { name: true } } } } },
        orderBy: { dueAt: 'asc' },
        take: 10,
      }),
      this.prisma.order.findMany({
        where: { status: 'CREATED', createdAt: { lt: dayAgo } },
        select: { id: true, amountMinor: true, createdAt: true, user: { select: { displayName: true, email: true, phone: true } }, product: { select: { titleEn: true } } },
        orderBy: { createdAt: 'asc' },
        take: 10,
      }),
    ]);

    const recentInstitutionAmounts = recentInstitutionInvoices.map((i) => ({ amountMinor: i.totalMinor, paidAt: i.paidAt }));
    const sumInRange = (rows: { amountMinor: number; paidAt: Date | null }[], from: Date, to?: Date) =>
      rows.reduce((sum, r) => (!r.paidAt || r.paidAt < from || (to && r.paidAt >= to) ? sum : sum + r.amountMinor), 0);

    // Last 12 calendar months, oldest first, keyed YYYY-MM.
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(twelveMonthsAgo.getFullYear(), twelveMonthsAgo.getMonth() + i, 1);
      return { label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), start: d, end: new Date(d.getFullYear(), d.getMonth() + 1, 1) };
    });
    const monthly = months.map((m) => ({
      month: m.label,
      studentRevenueMinor: sumInRange(recentStudentPayments, m.start, m.end),
      institutionRevenueMinor: sumInRange(recentInstitutionAmounts, m.start, m.end),
    }));

    const countBy = <T,>(rows: T[], keyOf: (row: T) => string) => {
      const map = new Map<string, number>();
      for (const row of rows) map.set(keyOf(row), (map.get(keyOf(row)) ?? 0) + 1);
      return map;
    };
    const institutionPlanCounts = countBy(institutionPlanRows, (r) => r.plan.nameEn);
    const institutionPlanMix = Array.from(institutionPlanCounts, ([nameEn, count]) => ({ nameEn, count }));
    const studentPlanCounts = countBy(studentPlanRows, (r) => r.product.titleEn);
    const studentPlanMix = Array.from(studentPlanCounts, ([titleEn, count]) => ({ titleEn, count }));

    const dayMs = 86_400_000;
    return {
      totalRevenueMinor: (allStudentPayments._sum.amountMinor ?? 0) + (allInstitutionInvoices._sum.totalMinor ?? 0),
      thisMonthRevenueMinor: sumInRange(recentStudentPayments, startOfThisMonth) + sumInRange(recentInstitutionAmounts, startOfThisMonth),
      lastMonthRevenueMinor:
        sumInRange(recentStudentPayments, startOfLastMonth, startOfThisMonth) + sumInRange(recentInstitutionAmounts, startOfLastMonth, startOfThisMonth),
      activeInstitutionSubs,
      activeStudentPlans,
      overdueInvoiceCount,
      monthly,
      institutionPlanMix,
      studentPlanMix,
      needsAttention: {
        stalledTrials: stalledTrials.map((s) => ({
          orgId: s.orgId,
          orgName: s.organization.name,
          planNameEn: s.plan.nameEn,
          sinceDays: Math.floor((now.getTime() - s.createdAt.getTime()) / dayMs),
        })),
        overdueInvoices: overdueInvoiceRows.map((i) => ({
          id: i.id,
          invoiceNumber: i.invoiceNumber,
          orgName: i.subscription.organization.name,
          amountMinor: i.totalMinor,
          dueAt: i.dueAt.toISOString(),
        })),
        unpaidOrders: unpaidOrderRows.map((o) => ({
          id: o.id,
          buyer: o.user.displayName ?? o.user.email ?? o.user.phone ?? '—',
          product: o.product.titleEn,
          amountMinor: o.amountMinor,
          createdAt: o.createdAt.toISOString(),
        })),
      },
    };
  }

  /** Academic Head's institution snapshot — strictly scoped to their own org. */
  async institutionOverview(principal: Principal) {
    const orgId = principal.orgId;
    if (!orgId) throw AppError.permissionDenied('This overview is only available to institution staff.');

    const courseFilter = { topic: { chapter: { subject: { course: { orgId } } } } };
    const [staff, students, courses, lessonsPublished, lessonsPendingReview, tests, openDoubts, openTickets] = await Promise.all([
      this.prisma.user.count({ where: { kind: 'STAFF', orgId, deletedAt: null } }),
      this.prisma.user.count({ where: { kind: 'STUDENT', orgId, deletedAt: null } }),
      this.prisma.course.count({ where: { orgId, deletedAt: null } }),
      this.prisma.lessonVersion.count({ where: { status: 'PUBLISHED', lesson: courseFilter } }),
      this.prisma.lessonVersion.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] }, lesson: courseFilter } }),
      this.prisma.test.count({ where: { orgId, deletedAt: null } }),
      this.prisma.doubt.count({ where: { orgId, status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
      this.prisma.supportTicket.count({ where: { orgId, status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
    ]);

    return { staff, students, courses, lessonsPublished, lessonsPendingReview, tests, openDoubts, openTickets };
  }

  /** Institute Intervention Radar (Phase 3) — reads the worker's pre-
   *  aggregated StudentRiskSignal rows (never computed live across a whole
   *  roster, see readiness/mistake-dna's own single-student-only precedent
   *  for why). Org-scoped exactly like institutionOverview above, plus an
   *  explicit re-check that the org hasn't been suspended since this staff
   *  member's session started — the sweep itself already skips SUSPENDED
   *  orgs, this is defense in depth on the read path too. */
  async atRiskStudents(principal: Principal): Promise<AtRiskStudentView[]> {
    const orgId = principal.orgId;
    if (!orgId) throw AppError.permissionDenied('This view is only available to institution staff.');
    const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { status: true } });
    if (org?.status !== 'ACTIVE') return [];

    const rows = await this.prisma.studentRiskSignal.findMany({
      where: { orgId },
      include: { user: { select: { displayName: true, phone: true, studentProfile: { select: { fullName: true } } } } },
    });

    return rows
      .map((r) => ({
        studentId: r.studentId,
        name: r.user.studentProfile?.fullName ?? r.user.displayName ?? '',
        phone: r.user.phone ?? '',
        riskLevel: r.riskLevel,
        flags: r.flags as AtRiskStudentView['flags'],
        inactiveDays: r.inactiveDays,
        planAdherencePercent: r.planAdherencePercent,
        avgScoreRecentPercent: r.avgScoreRecentPercent,
        avgScorePriorPercent: r.avgScorePriorPercent,
        dominantMistakeType: r.dominantMistakeType,
        computedAt: r.computedAt.toISOString(),
      }))
      .sort((a, b) => RISK_RANK[a.riskLevel] - RISK_RANK[b.riskLevel] || b.computedAt.localeCompare(a.computedAt));
  }

  /** Content pipeline breakdown — org-scoped for an institution's Content
   *  Admin/Academic Head, platform-wide for the platform Content Admin (no orgId). */
  async contentPipeline(principal: Principal) {
    const orgId = principal.orgId;
    const courseFilter = orgId ? { topic: { chapter: { subject: { course: { orgId } } } } } : {};
    // Question's course lives one hop closer (subject -> course, no
    // topic/chapter) than Lesson's, so it needs its own filter shape — and,
    // unlike lesson/course/test above, this was previously missing BOTH the
    // org scope (an Academic Head saw every institute's pending count, not
    // just their own) and deletedAt (soft-deleted questions kept counting
    // forever, e.g. after a bulk-delete). UNDER_REVIEW is included alongside
    // DRAFT/SUBMITTED since content.approve only acts on UNDER_REVIEW — a
    // question sitting there is still "pending approval", not done.
    const questionFilter = { deletedAt: null, ...(orgId ? { subject: { course: { orgId } } } : {}) };
    const [draft, submittedOrUnderReview, correctionRequired, approved, published, archivedOrRejected, courses, tests, questionsPending] =
      await Promise.all([
        this.prisma.lessonVersion.count({ where: { status: 'DRAFT', lesson: courseFilter } }),
        this.prisma.lessonVersion.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] }, lesson: courseFilter } }),
        this.prisma.lessonVersion.count({ where: { status: 'CORRECTION_REQUIRED', lesson: courseFilter } }),
        this.prisma.lessonVersion.count({ where: { status: { in: ['APPROVED', 'READY_TO_PUBLISH', 'SCHEDULED'] }, lesson: courseFilter } }),
        this.prisma.lessonVersion.count({ where: { status: 'PUBLISHED', lesson: courseFilter } }),
        this.prisma.lessonVersion.count({ where: { status: { in: ['ARCHIVED', 'REJECTED'] }, lesson: courseFilter } }),
        this.prisma.course.count({ where: { deletedAt: null, ...(orgId ? { orgId } : {}) } }),
        this.prisma.test.count({ where: { deletedAt: null, ...(orgId ? { orgId } : {}) } }),
        this.prisma.questionVersion.count({ where: { status: { in: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'] }, question: questionFilter } }),
      ]);

    return { draft, submittedOrUnderReview, correctionRequired, approved, published, archivedOrRejected, courses, tests, questionsPending };
  }

  /** Academic Reviewer's queue snapshot — pending count matches their exact
   *  scope-filtered review queue (same policy-engine filter as the queue itself). */
  async reviewOverview(principal: Principal) {
    const candidates = await this.prisma.lessonVersion.findMany({
      where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
      select: {
        status: true,
        lesson: { select: { topic: { select: { chapter: { select: { subject: true } } } } } },
      },
      take: 500,
    });
    let submitted = 0;
    let underReview = 0;
    for (const v of candidates) {
      const subject = v.lesson.topic.chapter.subject;
      const inScope = this.authz.check(principal, 'content.review', {
        type: 'content',
        status: v.status,
        scope: { subjectId: subject.id, courseId: subject.courseId },
      }).allow;
      if (!inScope) continue;
      if (v.status === 'SUBMITTED') submitted += 1;
      else underReview += 1;
    }

    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const [approvedByMeTotal, approvedByMeThisWeek, openDoubts] = await Promise.all([
      this.prisma.lessonVersion.count({ where: { approvedBy: principal.userId } }),
      this.prisma.lessonVersion.count({ where: { approvedBy: principal.userId, approvedAt: { gte: weekAgo } } }),
      this.prisma.doubt.count({
        where: {
          status: { notIn: ['RESOLVED', 'CLOSED'] },
          ...(principal.orgId ? { orgId: principal.orgId } : {}),
        },
      }),
    ]);

    return { pendingReview: submitted + underReview, submitted, underReview, approvedByMeTotal, approvedByMeThisWeek, openDoubts };
  }

  // ── Student & Institution Performance Reports ───────────────────────────
  // Backed by StudentPerformanceSnapshot/StudentSubjectPerformance, both
  // incrementally upserted in student-tests.service.ts#submit — these are
  // cheap groupBy/aggregate reads over small flat tables, never a live loop
  // over raw Attempt/AttemptAnswer rows. Every platform-wide query (no orgId)
  // excludes demo orgs, same convention as revenueOverview above.

  private pct(numerator: number, denominator: number): number | null {
    return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : null;
  }

  /** Platform-wide scope must include independent (no-org) students, not just
   *  exclude demo orgs — a naive `{ organization: { isDemo: false } }` filter
   *  on a nullable relation silently drops every student with orgId=null. */
  private snapshotScope(orgId: string | undefined) {
    return orgId ? { orgId } : { OR: [{ orgId: null }, { organization: { isDemo: false } }] };
  }
  private attemptStudentScope(orgId: string | undefined) {
    return orgId ? { orgId } : { OR: [{ orgId: null }, { org: { isDemo: false } }] };
  }

  async performanceOverview(principal: Principal): Promise<PerformanceOverview> {
    const orgId = principal.orgId;
    const snapshotScope = this.snapshotScope(orgId);
    const studentScope = this.attemptStudentScope(orgId);
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const priorWeekAgo = new Date(Date.now() - 14 * 86_400_000);

    const [agg, studentsAssessed, passFailRows, recentAgg, priorAgg] = await Promise.all([
      this.prisma.studentPerformanceSnapshot.aggregate({ where: snapshotScope, _sum: { totalAttempts: true, totalScore: true, totalMaxScore: true } }),
      this.prisma.studentPerformanceSnapshot.count({ where: snapshotScope }),
      // Pass rate needs each test's own passingScore (not a fixed threshold),
      // so this is a bounded flat select (newest 5000 submitted attempts in
      // scope, matching reviewOverview's own take-bound style above) rather
      // than a single aggregate — Prisma can't compare two columns of the
      // same row in a `where` clause.
      this.prisma.attempt.findMany({
        where: { status: { in: ['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'] }, student: studentScope },
        select: { score: true, testVersion: { select: { passingScore: true } } },
        orderBy: { submittedAt: 'desc' },
        take: 5000,
      }),
      this.prisma.attempt.aggregate({ where: { submittedAt: { gte: weekAgo }, student: studentScope }, _sum: { score: true, maxScore: true } }),
      this.prisma.attempt.aggregate({ where: { submittedAt: { gte: priorWeekAgo, lt: weekAgo }, student: studentScope }, _sum: { score: true, maxScore: true } }),
    ]);

    const gradable = passFailRows.filter((a) => a.testVersion.passingScore !== null);
    const passed = gradable.filter((a) => (a.score ?? 0) >= (a.testVersion.passingScore as number)).length;

    return {
      totalStudentsAssessed: studentsAssessed,
      totalAttempts: agg._sum.totalAttempts ?? 0,
      avgScorePercent: this.pct(agg._sum.totalScore ?? 0, agg._sum.totalMaxScore ?? 0),
      passRatePercent: this.pct(passed, gradable.length),
      // "This week" vs. "a week before that" — what the dashboard's trend
      // arrow (▲/▼) compares against, same two-window shape as
      // revenueOverview's thisMonth/lastMonth delta above.
      avgScorePercentPrior: this.pct(priorAgg._sum.score ?? 0, priorAgg._sum.maxScore ?? 0),
      avgScorePercentRecent: this.pct(recentAgg._sum.score ?? 0, recentAgg._sum.maxScore ?? 0),
    };
  }

  async performanceTrend(principal: Principal): Promise<PerformanceTrendPoint[]> {
    const studentScope = this.attemptStudentScope(principal.orgId);
    const twelveWeeksAgo = new Date(Date.now() - 12 * 7 * 86_400_000);

    const attempts = await this.prisma.attempt.findMany({
      where: { submittedAt: { gte: twelveWeeksAgo }, status: { in: ['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'] }, student: studentScope },
      select: { score: true, maxScore: true, submittedAt: true },
    });

    const weeks = Array.from({ length: 12 }, (_, i) => {
      const start = new Date(twelveWeeksAgo.getTime() + i * 7 * 86_400_000);
      return { start, end: new Date(start.getTime() + 7 * 86_400_000) };
    });

    return weeks.map((w) => {
      const inWeek = attempts.filter((a) => a.submittedAt && a.submittedAt >= w.start && a.submittedAt < w.end);
      const sumScore = inWeek.reduce((s, a) => s + (a.score ?? 0), 0);
      const sumMax = inWeek.reduce((s, a) => s + a.maxScore, 0);
      return { weekStart: w.start.toISOString().slice(0, 10), avgScorePercent: this.pct(sumScore, sumMax), attempts: inWeek.length };
    });
  }

  async performanceBySubject(principal: Principal): Promise<SubjectPerformanceRow[]> {
    const rows = await this.prisma.studentSubjectPerformance.groupBy({
      by: ['subjectId'],
      where: this.snapshotScope(principal.orgId),
      _sum: { attemptsCount: true, correctCount: true },
    });
    if (rows.length === 0) return [];
    const subjects = await this.prisma.subject.findMany({
      where: { id: { in: rows.map((r) => r.subjectId) } },
      select: { id: true, nameEn: true, nameHi: true },
    });
    const subjectById = new Map(subjects.map((s) => [s.id, s]));
    return rows
      .map((r) => {
        const subject = subjectById.get(r.subjectId);
        return {
          subjectId: r.subjectId,
          subjectNameEn: subject?.nameEn ?? '—',
          subjectNameHi: subject?.nameHi ?? '—',
          accuracyPercent: this.pct(r._sum.correctCount ?? 0, r._sum.attemptsCount ?? 0),
          attemptCount: r._sum.attemptsCount ?? 0,
        };
      })
      .sort((a, b) => b.attemptCount - a.attemptCount);
  }

  /** Super Admin only — a platform-wide ranking across institutions would be
   *  meaningless (and a privacy overreach) for an Academic Head to see. */
  async institutionLeaderboard(principal: Principal): Promise<InstitutionLeaderboardRow[]> {
    if (principal.orgId) throw AppError.permissionDenied('Institution leaderboard is a platform-wide view.');

    const rows = await this.prisma.studentPerformanceSnapshot.groupBy({
      by: ['orgId'],
      where: { orgId: { not: null }, organization: { isDemo: false } },
      _sum: { totalScore: true, totalMaxScore: true, totalAttempts: true },
      _count: { studentId: true },
    });
    if (rows.length === 0) return [];
    const orgs = await this.prisma.organization.findMany({
      where: { id: { in: rows.map((r) => r.orgId as string) } },
      select: { id: true, name: true },
    });
    const orgById = new Map(orgs.map((o) => [o.id, o]));
    return rows
      .map((r) => ({
        orgId: r.orgId as string,
        orgName: orgById.get(r.orgId as string)?.name ?? '—',
        studentsAssessed: r._count.studentId,
        avgScorePercent: this.pct(r._sum.totalScore ?? 0, r._sum.totalMaxScore ?? 0),
        totalAttempts: r._sum.totalAttempts ?? 0,
      }))
      .sort((a, b) => (b.avgScorePercent ?? -1) - (a.avgScorePercent ?? -1));
  }

  /** Org-scoped only — Super Admin drills into one institution at a time via
   *  institutionLeaderboard rather than a single platform-wide student rank. */
  async studentLeaderboard(principal: Principal): Promise<StudentLeaderboardRow[]> {
    const orgId = principal.orgId;
    if (!orgId) throw AppError.permissionDenied('This view is only available to institution staff.');

    const rows = await this.prisma.studentPerformanceSnapshot.findMany({
      where: { orgId },
      include: { user: { select: { displayName: true, studentProfile: { select: { fullName: true } } } } },
      orderBy: { totalScore: 'desc' },
      take: 50,
    });
    return rows
      .map((r) => ({
        studentId: r.studentId,
        name: r.user.studentProfile?.fullName ?? r.user.displayName ?? '—',
        avgScorePercent: this.pct(r.totalScore, r.totalMaxScore),
        totalAttempts: r.totalAttempts,
        lastAttemptAt: r.lastAttemptAt?.toISOString() ?? null,
      }))
      .sort((a, b) => (b.avgScorePercent ?? -1) - (a.avgScorePercent ?? -1));
  }

  /** Super Admin: any student. Academic Head: only a student in their own
   *  org — explicit ownership check, matching atRiskStudents' defense-in-
   *  depth style rather than trusting the list endpoint already filtered. */
  async studentPerformanceDetail(principal: Principal, studentId: string): Promise<StudentPerformanceDetail> {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { orgId: true, displayName: true, studentProfile: { select: { fullName: true } } },
    });
    if (!student) throw AppError.notFound('Student not found.');
    if (principal.orgId && student.orgId !== principal.orgId) {
      throw AppError.permissionDenied('This student is not in your institution.');
    }

    const [snapshot, subjects, recentAttempts, weakConcepts] = await Promise.all([
      this.prisma.studentPerformanceSnapshot.findUnique({ where: { studentId } }),
      this.performanceBySubjectForStudent(studentId),
      this.prisma.attempt.findMany({
        where: { studentId, status: { in: ['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'] } },
        orderBy: { submittedAt: 'desc' },
        take: 10,
        select: { id: true, score: true, maxScore: true, submittedAt: true, testVersion: { select: { test: { select: { titleEn: true } } } } },
      }),
      this.prisma.studentConceptMastery.findMany({
        where: { studentId },
        include: { concept: { select: { nameEn: true } } },
        orderBy: { attemptsCount: 'desc' },
        take: 200,
      }),
    ]);

    return {
      studentId,
      name: student.studentProfile?.fullName ?? student.displayName ?? '—',
      avgScorePercent: snapshot ? this.pct(snapshot.totalScore, snapshot.totalMaxScore) : null,
      totalAttempts: snapshot?.totalAttempts ?? 0,
      recentAttempts: recentAttempts.map((a) => ({
        attemptId: a.id,
        testTitleEn: a.testVersion.test.titleEn,
        scorePercent: a.score !== null ? this.pct(a.score, a.maxScore) : null,
        submittedAt: a.submittedAt?.toISOString() ?? null,
      })),
      subjects,
      weakConcepts: weakConcepts
        .map((m) => ({
          conceptId: m.conceptId,
          conceptNameEn: m.concept.nameEn,
          accuracyPercent: this.pct(m.correctCount, m.attemptsCount),
          attemptsCount: m.attemptsCount,
        }))
        .filter((c) => c.accuracyPercent !== null && c.accuracyPercent < 60)
        .sort((a, b) => (a.accuracyPercent ?? 0) - (b.accuracyPercent ?? 0))
        .slice(0, 10),
    };
  }

  private async performanceBySubjectForStudent(studentId: string): Promise<SubjectPerformanceRow[]> {
    const rows = await this.prisma.studentSubjectPerformance.findMany({
      where: { studentId },
      include: { subject: { select: { nameEn: true, nameHi: true } } },
    });
    return rows
      .map((r) => ({
        subjectId: r.subjectId,
        subjectNameEn: r.subject.nameEn,
        subjectNameHi: r.subject.nameHi,
        accuracyPercent: this.pct(r.correctCount, r.attemptsCount),
        attemptCount: r.attemptsCount,
      }))
      .sort((a, b) => b.attemptCount - a.attemptCount);
  }

  /** Live Classes engagement — the most recent ended classes in scope
   *  (Super Admin: platform-wide; Academic Head: their own org only, same
   *  principal.orgId branch as performanceOverview above). Live-queried, not
   *  a precomputed snapshot — matches performanceTrend's pattern, since
   *  live-class volume is low by design. entitledCount reuses
   *  EntitlementService.entitledUserIdsForCourse (same shared method the
   *  T-15 reminder and reschedule/cancel notifications use), one call per
   *  distinct course among the recent classes rather than per class. */
  async liveClassEngagement(principal: Principal): Promise<LiveClassEngagementRow[]> {
    const classes = await this.prisma.liveClass.findMany({
      where: {
        deletedAt: null,
        status: 'SCHEDULED',
        orgId: principal.orgId ?? undefined,
        startsAt: { lt: new Date() }, // already started — a stable "ended" proxy good enough for a recent-classes list; exact end is startsAt+durationMinutes, checked below
      },
      orderBy: { startsAt: 'desc' },
      take: 20,
      include: { course: { select: { examId: true } }, attendees: { select: { joinedAt: true, lastSeenAt: true } } },
    });
    const ended = classes.filter((c) => c.startsAt.getTime() + c.durationMinutes * 60_000 <= Date.now());

    const entitledCountByCourse = new Map<string, number>();
    for (const c of ended) {
      if (entitledCountByCourse.has(c.courseId)) continue;
      const ids = await this.entitlements.entitledUserIdsForCourse(c.courseId, c.course.examId);
      entitledCountByCourse.set(c.courseId, ids.length);
    }

    return ended.map((c) => {
      const entitledCount = entitledCountByCourse.get(c.courseId) ?? 0;
      const durations = c.attendees.map((a) => (a.lastSeenAt.getTime() - a.joinedAt.getTime()) / 60_000);
      const avgDurationMinutes = durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : null;
      return {
        id: c.id,
        titleHi: c.titleHi,
        titleEn: c.titleEn,
        startsAt: c.startsAt.toISOString(),
        attendeeCount: c.attendees.length,
        entitledCount,
        attendanceRatePercent: this.pct(c.attendees.length, entitledCount),
        avgDurationMinutes,
      };
    });
  }
}
