import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  private studentId(p: Principal): string {
    if (p.kind !== 'STUDENT') throw AppError.permissionDenied('Student account required.');
    return p.userId;
  }

  /** Mirrors student.service.ts's toggleBookmark exactly — findUnique on the
   *  compound key, delete if present else create. */
  async toggle(p: Principal, courseId: string): Promise<{ wishlisted: boolean }> {
    const userId = this.studentId(p);
    const existing = await this.prisma.wishlist.findUnique({ where: { userId_courseId: { userId, courseId } } });
    if (existing) {
      await this.prisma.wishlist.delete({ where: { id: existing.id } });
      return { wishlisted: false };
    }
    await this.prisma.wishlist.create({ data: { userId, courseId } });
    return { wishlisted: true };
  }

  async courseIds(p: Principal): Promise<string[]> {
    const userId = this.studentId(p);
    const rows = await this.prisma.wishlist.findMany({ where: { userId }, select: { courseId: true } });
    return rows.map((r) => r.courseId);
  }

  /** Same shape as the public courses() endpoint (catalogue.controller.ts),
   *  filtered to this student's wishlisted, still-active-and-public courses.
   *  A wishlisted course that later became unavailable silently drops out —
   *  no "unavailable" placeholder row. */
  async list(p: Principal) {
    const userId = this.studentId(p);
    const wishlisted = await this.prisma.wishlist.findMany({ where: { userId }, select: { courseId: true } });
    const courseIds = wishlisted.map((w) => w.courseId);
    if (courseIds.length === 0) return [];

    const rows = await this.prisma.course.findMany({
      where: { id: { in: courseIds }, deletedAt: null, status: 'ACTIVE', visibility: 'PUBLIC' },
      orderBy: { sequence: 'asc' },
      select: {
        id: true, code: true, titleHi: true, titleEn: true, stateId: true, examId: true, orgId: true,
        createdAt: true, organization: { select: { name: true } },
      },
    });
    const liveIds = rows.map((r) => r.id);
    const [ratingAgg, enrollmentAgg] = await Promise.all([
      this.prisma.courseRating.groupBy({ by: ['courseId'], where: { courseId: { in: liveIds }, status: 'VISIBLE' }, _avg: { rating: true }, _count: { rating: true } }),
      this.prisma.entitlement.groupBy({ by: ['courseId'], where: { courseId: { in: liveIds }, status: 'ACTIVE' }, _count: { courseId: true } }),
    ]);
    const ratingByCourse = new Map(ratingAgg.map((r) => [r.courseId, { avgRating: r._avg.rating ?? 0, ratingCount: r._count.rating }]));
    const enrollmentByCourse = new Map(enrollmentAgg.map((e) => [e.courseId as string, e._count.courseId]));
    return rows.map(({ organization, createdAt, ...c }) => ({
      ...c,
      createdAt: createdAt.toISOString(),
      orgName: organization?.name ?? null,
      avgRating: ratingByCourse.get(c.id)?.avgRating ?? 0,
      ratingCount: ratingByCourse.get(c.id)?.ratingCount ?? 0,
      enrollmentCount: enrollmentByCourse.get(c.id) ?? 0,
    }));
  }
}
