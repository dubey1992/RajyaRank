import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type { UpsertCoursePricing, CreateCoupon, CoursePricingView, CouponView } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../authz/authorization.service';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors/app-error';

interface Scope {
  orgId?: string;
  stateId?: string;
  examId?: string;
  courseId?: string;
}

/**
 * Course-level pricing + coupons authoring. Mirrors CoursesService's scope
 * pattern exactly: load the real course, re-check `course.manage` against its
 * actual state/exam/org, never trust the caller's claimed scope.
 */
@Injectable()
export class CoursePricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
    private readonly audit: AuditService,
  ) {}

  private assertScope(principal: Principal, scope: Scope) {
    const decision = this.authz.check(principal, 'course.manage', { type: 'course', scope });
    if (!decision.allow) throw AppError.permissionDenied('Resource is outside your assigned scope.');
  }

  private async courseScope(courseId: string) {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, deletedAt: null } });
    if (!course) throw AppError.notFound('Course not found.');
    return { course, scope: { orgId: course.orgId ?? undefined, stateId: course.stateId, examId: course.examId, courseId: course.id } };
  }

  async get(principal: Principal, courseId: string, audience: 'PUBLIC' | 'INSTITUTE' = 'PUBLIC'): Promise<CoursePricingView> {
    const { scope } = await this.courseScope(courseId);
    this.assertScope(principal, scope);
    const product = await this.prisma.product.findFirst({ where: { courseId, kind: 'COURSE', audience } });
    if (!product) {
      return { id: null, priceMinor: 0, originalPriceMinor: null, currency: 'INR', validityDays: null, accessType: 'FREE', active: false, audience };
    }
    return {
      id: product.id,
      priceMinor: product.priceMinor,
      originalPriceMinor: product.originalPriceMinor,
      currency: product.currency,
      validityDays: product.validityDays,
      accessType: product.accessType,
      active: product.active,
      audience: product.audience,
    };
  }

  async upsert(principal: Principal, courseId: string, dto: UpsertCoursePricing): Promise<CoursePricingView> {
    const { course, scope } = await this.courseScope(courseId);
    this.assertScope(principal, scope);
    if (dto.audience === 'INSTITUTE' && !course.orgId) {
      throw AppError.conflict('Set the course to an institute first — an institute price only applies to an institute-owned course.');
    }
    const product = await this.prisma.product.upsert({
      where: { courseId_kind_audience: { courseId, kind: 'COURSE', audience: dto.audience } },
      update: {
        titleHi: dto.titleHi ?? course.titleHi,
        titleEn: dto.titleEn ?? course.titleEn,
        priceMinor: dto.priceMinor,
        originalPriceMinor: dto.originalPriceMinor ?? null,
        currency: dto.currency,
        validityDays: dto.validityDays ?? null,
        accessType: dto.accessType,
        active: dto.active,
      },
      create: {
        kind: 'COURSE',
        courseId,
        audience: dto.audience,
        titleHi: dto.titleHi ?? course.titleHi,
        titleEn: dto.titleEn ?? course.titleEn,
        priceMinor: dto.priceMinor,
        originalPriceMinor: dto.originalPriceMinor ?? null,
        currency: dto.currency,
        validityDays: dto.validityDays ?? null,
        accessType: dto.accessType,
        active: dto.active,
      },
    });
    await this.audit.record({
      actorUserId: principal.userId,
      action: 'course.pricing_upsert',
      targetType: 'Product',
      targetId: product.id,
      result: 'SUCCESS',
      after: { courseId, priceMinor: dto.priceMinor, accessType: dto.accessType, audience: dto.audience },
    });
    return {
      id: product.id,
      priceMinor: product.priceMinor,
      originalPriceMinor: product.originalPriceMinor,
      currency: product.currency,
      validityDays: product.validityDays,
      accessType: product.accessType,
      active: product.active,
      audience: product.audience,
    };
  }

  async listCoupons(principal: Principal, courseId?: string): Promise<CouponView[]> {
    if (courseId) {
      const { scope } = await this.courseScope(courseId);
      this.assertScope(principal, scope);
    } else {
      // Platform-wide coupon list: capability-only, no resource scope (matches
      // policy.engine.ts's handling of scope-less checks for global reads).
      const decision = this.authz.check(principal, 'course.manage', { type: 'course', scope: {} });
      if (!decision.allow) throw AppError.permissionDenied();
    }
    const coupons = await this.prisma.coupon.findMany({
      where: courseId ? { courseId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return coupons.map((c) => ({
      id: c.id,
      code: c.code,
      type: c.type,
      value: c.value,
      validFrom: c.validFrom?.toISOString() ?? null,
      validTo: c.validTo?.toISOString() ?? null,
      maxRedemptions: c.maxRedemptions,
      perUserLimit: c.perUserLimit,
      courseId: c.courseId,
      redeemedCount: c.redeemedCount,
      active: c.active,
    }));
  }

  async createCoupon(principal: Principal, dto: CreateCoupon): Promise<CouponView> {
    if (dto.courseId) {
      const { scope } = await this.courseScope(dto.courseId);
      this.assertScope(principal, scope);
    }
    const existing = await this.prisma.coupon.findUnique({ where: { code: dto.code } });
    if (existing) throw AppError.conflict('A coupon with this code already exists.');
    const coupon = await this.prisma.coupon.create({
      data: {
        code: dto.code,
        type: dto.type,
        value: dto.value,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validTo: dto.validTo ? new Date(dto.validTo) : null,
        maxRedemptions: dto.maxRedemptions ?? null,
        perUserLimit: dto.perUserLimit,
        courseId: dto.courseId ?? null,
        active: dto.active,
      },
    });
    await this.audit.record({
      actorUserId: principal.userId,
      action: 'coupon.create',
      targetType: 'Coupon',
      targetId: coupon.id,
      result: 'SUCCESS',
      after: { code: coupon.code },
    });
    return {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      validFrom: coupon.validFrom?.toISOString() ?? null,
      validTo: coupon.validTo?.toISOString() ?? null,
      maxRedemptions: coupon.maxRedemptions,
      perUserLimit: coupon.perUserLimit,
      courseId: coupon.courseId,
      redeemedCount: coupon.redeemedCount,
      active: coupon.active,
    };
  }
}
