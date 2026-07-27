import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type { CourseRatingQueueItem, CourseRatingsResponse, CourseRatingView, SubmitRating } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementService } from '../payments/entitlement.service';
import { AppError } from '../common/errors/app-error';

const REPORT_THRESHOLD = 3;

function toView(r: { id: string; userId: string; rating: number; comment: string | null; createdAt: Date; updatedAt: Date; user: { displayName: string | null } }): CourseRatingView {
  return {
    id: r.id,
    userId: r.userId,
    userName: r.user.displayName ?? 'Student',
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

@Injectable()
export class RatingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementService,
  ) {}

  private studentId(p: Principal): string {
    if (p.kind !== 'STUDENT') throw AppError.permissionDenied('Student account required.');
    return p.userId;
  }

  /** Public: visible ratings + aggregate for a course, newest first. */
  async forCourse(courseId: string): Promise<CourseRatingsResponse> {
    const rows = await this.prisma.courseRating.findMany({
      where: { courseId, status: 'VISIBLE' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { displayName: true } } },
    });
    const breakdown: CourseRatingsResponse['summary']['breakdown'] = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const r of rows) breakdown[String(r.rating) as keyof typeof breakdown]++;
    const count = rows.length;
    const average = count === 0 ? 0 : rows.reduce((sum, r) => sum + r.rating, 0) / count;
    return { summary: { average, count, breakdown }, ratings: rows.map(toView) };
  }

  /** Student: does the caller have purchase access to this course? Backs the
   *  web app's decision to show the submit form at all. */
  async hasAccess(p: Principal, courseId: string): Promise<boolean> {
    const userId = this.studentId(p);
    return this.entitlements.hasCourseAccess(userId, courseId);
  }

  /** Student: submit or edit own rating. Purchaser-only (reuses the same
   *  entitlement check the content gate trusts), auto-published. */
  async submit(p: Principal, courseId: string, dto: SubmitRating): Promise<CourseRatingView> {
    const userId = this.studentId(p);
    const hasAccess = await this.entitlements.hasCourseAccess(userId, courseId);
    if (!hasAccess) throw AppError.entitlementRequired('Purchase this course to rate it.');

    const row = await this.prisma.courseRating.upsert({
      where: { courseId_userId: { courseId, userId } },
      create: { courseId, userId, rating: dto.rating, comment: dto.comment ?? null, status: 'VISIBLE' },
      update: { rating: dto.rating, comment: dto.comment ?? null, status: 'VISIBLE', reportCount: 0 },
      include: { user: { select: { displayName: true } } },
    });
    return toView(row);
  }

  /** Student: report a rating as inappropriate. Once reportCount crosses the
   *  threshold it drops out of the public list pending a moderator look —
   *  reactive moderation rather than pre-publish review. */
  async report(p: Principal, ratingId: string): Promise<{ reported: true }> {
    this.studentId(p);
    const rating = await this.prisma.courseRating.findFirst({ where: { id: ratingId, status: 'VISIBLE' } });
    if (!rating) throw AppError.notFound('Rating not found.');
    const reportCount = rating.reportCount + 1;
    await this.prisma.courseRating.update({
      where: { id: ratingId },
      data: { reportCount, ...(reportCount >= REPORT_THRESHOLD ? { status: 'HIDDEN' } : {}) },
    });
    return { reported: true };
  }

  /** Staff (support.manage): moderation queue — reported + hidden ratings,
   *  org-scoped via the rated course's institution, same pattern as the
   *  doubts/support staff queues. */
  async queue(p: Principal): Promise<CourseRatingQueueItem[]> {
    const orgScoped = !p.isSuperAdmin && !!p.orgId;
    const rows = await this.prisma.courseRating.findMany({
      where: { OR: [{ reportCount: { gt: 0 } }, { status: 'HIDDEN' }], ...(orgScoped ? { course: { orgId: p.orgId } } : {}) },
      orderBy: [{ status: 'asc' }, { reportCount: 'desc' }],
      take: 200,
      include: { user: { select: { displayName: true } }, course: { select: { id: true, titleHi: true, titleEn: true } } },
    });
    return rows.map((r) => ({
      ...toView(r),
      courseId: r.course.id,
      courseTitleHi: r.course.titleHi,
      courseTitleEn: r.course.titleEn,
      status: r.status,
      reportCount: r.reportCount,
    }));
  }

  /** Staff (support.manage): approve (clear reports, keep/restore visible)
   *  or hide a rating. Org-scoped the same way the queue itself is. */
  async moderate(p: Principal, ratingId: string, action: 'approve' | 'hide'): Promise<{ id: string; status: 'VISIBLE' | 'HIDDEN' }> {
    const orgScoped = !p.isSuperAdmin && !!p.orgId;
    const rating = await this.prisma.courseRating.findFirst({ where: { id: ratingId, ...(orgScoped ? { course: { orgId: p.orgId } } : {}) } });
    if (!rating) throw AppError.notFound('Rating not found.');
    const status = action === 'approve' ? 'VISIBLE' : 'HIDDEN';
    await this.prisma.courseRating.update({ where: { id: ratingId }, data: { status, reportCount: action === 'approve' ? 0 : rating.reportCount } });
    return { id: ratingId, status };
  }
}
