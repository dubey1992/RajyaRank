import { Injectable } from '@nestjs/common';
import type { Order, Payment, Product } from '@prisma/client';
import type { Principal } from '@rajyarank/auth';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors/app-error';

/**
 * Entitlements are the SINGLE source of course access — never a global isPaid
 * flag. An entitlement is granted only from a verified payment (or an authorised
 * admin/scholarship grant), and access checks validate status + expiry.
 */
@Injectable()
export class EntitlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Idempotently grant/refresh an entitlement from a paid order. */
  async grantFromOrder(order: Order, product: Product, payment: Payment | null) {
    const endsAt = product.validityDays ? new Date(Date.now() + product.validityDays * 86_400_000) : null;
    const entitlement = await this.prisma.entitlement.upsert({
      where: { userId_productId: { userId: order.userId, productId: product.id } },
      update: { status: 'ACTIVE', endsAt, orderId: order.id, paymentId: payment?.id ?? null, source: 'PURCHASE' },
      create: {
        userId: order.userId,
        productId: product.id,
        courseId: product.courseId,
        source: 'PURCHASE',
        status: 'ACTIVE',
        accessType: product.accessType,
        endsAt,
        orderId: order.id,
        paymentId: payment?.id ?? null,
      },
    });
    await this.audit.record({
      actorUserId: order.userId,
      action: 'entitlement.granted',
      targetType: 'Entitlement',
      targetId: entitlement.id,
      result: 'SUCCESS',
      after: { source: 'PURCHASE', productId: product.id },
    });
    return entitlement;
  }

  async grantManual(admin: Principal, dto: { userId: string; productId: string; source: 'ADMIN' | 'SCHOLARSHIP' | 'PROMOTION'; reason?: string; endsAt?: string }) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw AppError.notFound('Product not found.');
    const entitlement = await this.prisma.entitlement.upsert({
      where: { userId_productId: { userId: dto.userId, productId: dto.productId } },
      update: { status: 'ACTIVE', source: dto.source, reason: dto.reason ?? null, endsAt: dto.endsAt ? new Date(dto.endsAt) : null },
      create: {
        userId: dto.userId,
        productId: dto.productId,
        courseId: product.courseId,
        source: dto.source,
        status: 'ACTIVE',
        accessType: dto.source === 'SCHOLARSHIP' ? 'SCHOLARSHIP' : 'ADMIN_GRANTED',
        reason: dto.reason ?? null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      },
    });
    await this.audit.record({
      actorUserId: admin.userId,
      actorRole: admin.roleKeys.join(','),
      action: 'entitlement.granted',
      targetType: 'Entitlement',
      targetId: entitlement.id,
      result: 'SUCCESS',
      after: { source: dto.source, userId: dto.userId, productId: dto.productId },
    });
    return entitlement;
  }

  async revoke(admin: Principal, id: string, reason?: string) {
    const ent = await this.prisma.entitlement.findUnique({ where: { id } });
    if (!ent) throw AppError.notFound('Entitlement not found.');
    await this.prisma.entitlement.update({ where: { id }, data: { status: 'REVOKED', reason: reason ?? null } });
    await this.audit.record({
      actorUserId: admin.userId,
      action: 'entitlement.revoked',
      targetType: 'Entitlement',
      targetId: id,
      result: 'SUCCESS',
      before: { status: ent.status },
      after: { status: 'REVOKED', reason: reason ?? null },
    });
    return { id, status: 'REVOKED' };
  }

  /** Does the user have live access to this course? Used by the content gate.
   *  Checks a direct course entitlement first, then falls back to an active
   *  student subscription plan (see student-plans/) covering this course's
   *  exam — either a Pro/all-access plan (Product.examId null) or a Plus plan
   *  scoped to this exact exam. Every existing call site benefits from this
   *  automatically; nothing else needed to change. */
  async hasCourseAccess(userId: string, courseId: string): Promise<boolean> {
    const now = new Date();
    const activeWhere = { status: 'ACTIVE' as const, OR: [{ endsAt: null }, { endsAt: { gt: now } }] };
    const direct = await this.prisma.entitlement.findFirst({ where: { userId, courseId, ...activeWhere } });
    if (direct) return true;

    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { examId: true } });
    if (!course) return false;
    const subscription = await this.prisma.entitlement.findFirst({
      where: {
        userId,
        ...activeWhere,
        product: { kind: 'SUBSCRIPTION', OR: [{ examId: null }, { examId: course.examId }] },
      },
    });
    return Boolean(subscription);
  }

  async listMine(userId: string) {
    const ents = await this.prisma.entitlement.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { product: true } });
    return ents.map((e) => ({
      id: e.id,
      productId: e.productId,
      productKind: e.product.kind,
      productTitleHi: e.product.titleHi,
      productTitleEn: e.product.titleEn,
      courseId: e.courseId,
      source: e.source,
      status: e.status,
      accessType: e.accessType,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt?.toISOString() ?? null,
    }));
  }
}
