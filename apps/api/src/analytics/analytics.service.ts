import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type { AtRiskStudentView, RiskLevel } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../authz/authorization.service';
import { AppError } from '../common/errors/app-error';

const RISK_RANK: Record<RiskLevel, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/** Aggregated product/academic/ops metrics for the admin dashboard.
 *  Read-only Prisma counts/aggregates — no raw data leaves the API. */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
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
      this.prisma.institutionInvoice.aggregate({ _sum: { totalMinor: true }, where: { status: 'PAID' } }),
      this.prisma.payment.findMany({ where: { status: 'PAID', paidAt: { gte: twelveMonthsAgo } }, select: { amountMinor: true, paidAt: true } }),
      this.prisma.institutionInvoice.findMany({ where: { status: 'PAID', paidAt: { gte: twelveMonthsAgo } }, select: { totalMinor: true, paidAt: true } }),
      this.prisma.organizationSubscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.entitlement.count({ where: { status: 'ACTIVE', product: { kind: 'SUBSCRIPTION' }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] } }),
      this.prisma.institutionInvoice.count({ where: { status: 'OVERDUE' } }),
      this.prisma.organizationSubscription.findMany({ where: { status: 'ACTIVE' }, select: { plan: { select: { nameHi: true, nameEn: true } } } }),
      this.prisma.entitlement.findMany({
        where: { status: 'ACTIVE', product: { kind: 'SUBSCRIPTION' }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        select: { product: { select: { titleHi: true, titleEn: true } } },
      }),
      this.prisma.organizationSubscription.findMany({
        where: { status: 'TRIALING', createdAt: { lt: twoDaysAgo } },
        select: { orgId: true, createdAt: true, organization: { select: { name: true } }, plan: { select: { nameEn: true } } },
        orderBy: { createdAt: 'asc' },
        take: 10,
      }),
      this.prisma.institutionInvoice.findMany({
        where: { status: 'OVERDUE' },
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
}
