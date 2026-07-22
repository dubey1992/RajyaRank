import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../authz/authorization.service';
import { AppError } from '../common/errors/app-error';

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
      revenue,
      paidOrders,
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
      this.prisma.payment.aggregate({ _sum: { amountMinor: true }, where: { status: 'PAID' } }),
      this.prisma.order.count({ where: { status: 'PAID' } }),
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
      revenueMinor: revenue._sum.amountMinor ?? 0,
      paidOrders,
      openDoubts,
      openTickets,
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

  /** Content pipeline breakdown — org-scoped for an institution's Content
   *  Admin/Academic Head, platform-wide for the platform Content Admin (no orgId). */
  async contentPipeline(principal: Principal) {
    const orgId = principal.orgId;
    const courseFilter = orgId ? { topic: { chapter: { subject: { course: { orgId } } } } } : {};
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
        this.prisma.questionVersion.count({ where: { status: { in: ['DRAFT', 'SUBMITTED'] } } }),
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
