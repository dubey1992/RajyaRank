import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type { CustomerDetail, CustomerSearchResult } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { StudentsService } from '../students/students.service';
import { SessionService } from '../auth/session.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Read-only, org-scoped "everything about this student" view — built so
 * support staff can diagnose an account issue without ever needing direct
 * database access. Every section here reads data that already exists;
 * fixes still go through the existing, audited admin actions
 * (force-password-reset, revoke-sessions, status change) reused as-is from
 * the students module.
 */
@Injectable()
export class CustomerLookupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly students: StudentsService,
    private readonly sessions: SessionService,
  ) {}

  private orgScoped(actor: Principal): boolean {
    return !actor.isSuperAdmin && !!actor.orgId;
  }

  async search(actor: Principal, query: string): Promise<CustomerSearchResult[]> {
    const q = query.trim();
    if (!q) return [];
    const orgFilter = this.orgScoped(actor) ? { orgId: actor.orgId } : {};

    // Searching by order id is an exact match, resolved to its owning student.
    let orderMatchUserId: string | null = null;
    if (UUID_RE.test(q)) {
      const order = await this.prisma.order.findUnique({ where: { id: q }, select: { userId: true } });
      orderMatchUserId = order?.userId ?? null;
    }

    const users = await this.prisma.user.findMany({
      where: {
        kind: 'STUDENT',
        deletedAt: null,
        ...orgFilter,
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          { studentProfile: { fullName: { contains: q, mode: 'insensitive' } } },
          ...(orderMatchUserId ? [{ id: orderMatchUserId }] : []),
        ],
      },
      include: { studentProfile: true },
      take: 20,
    });

    return users.map((u) => ({
      id: u.id,
      fullName: u.studentProfile?.fullName ?? u.displayName ?? '',
      email: u.email,
      phone: u.phone ?? '',
      status: u.status,
    }));
  }

  async detail(actor: Principal, userId: string): Promise<CustomerDetail> {
    const student = await this.students.requireStudent(actor, userId);

    const [org, orders, entitlements, tickets, doubts, sessions] = await Promise.all([
      student.orgId ? this.prisma.organization.findUnique({ where: { id: student.orgId }, select: { name: true } }) : null,
      this.prisma.order.findMany({
        where: { userId },
        include: {
          product: { select: { titleHi: true, titleEn: true } },
          coupon: { select: { code: true } },
          payments: { select: { id: true, status: true, providerPaymentId: true, paidAt: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.entitlement.findMany({
        where: { userId },
        include: { product: { select: { titleHi: true, titleEn: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supportTicket.findMany({
        where: { studentId: userId },
        include: { replies: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.doubt.findMany({
        where: { studentId: userId },
        include: { replies: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.sessions.list(userId),
    ]);

    const orderIds = orders.map((o) => o.id);
    const activity = await this.prisma.auditLog.findMany({
      where: { OR: [{ actorUserId: userId }, { targetType: 'Order', targetId: { in: orderIds } }] },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      id: student.id,
      fullName: student.studentProfile?.fullName ?? student.displayName ?? '',
      email: student.email,
      phone: student.phone ?? '',
      status: student.status,
      orgName: org?.name ?? null,
      createdAt: student.createdAt.toISOString(),
      lastLoginAt: student.lastLoginAt?.toISOString() ?? null,
      orders: orders.map((o) => ({
        id: o.id,
        productTitleHi: o.product.titleHi,
        productTitleEn: o.product.titleEn,
        amountMinor: o.amountMinor,
        currency: o.currency,
        status: o.status,
        couponCode: o.coupon?.code ?? null,
        createdAt: o.createdAt.toISOString(),
        payments: o.payments.map((p) => ({
          id: p.id,
          status: p.status,
          providerPaymentId: p.providerPaymentId,
          paidAt: p.paidAt?.toISOString() ?? null,
        })),
      })),
      entitlements: entitlements.map((e) => ({
        id: e.id,
        productTitleHi: e.product.titleHi,
        productTitleEn: e.product.titleEn,
        status: e.status,
        startsAt: e.startsAt?.toISOString() ?? null,
        endsAt: e.endsAt?.toISOString() ?? null,
      })),
      tickets: tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        category: t.category,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        replyCount: t.replies.length,
      })),
      doubts: doubts.map((d) => ({
        id: d.id,
        bodyText: d.bodyText,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
        replyCount: d.replies.length,
      })),
      sessions: sessions.map((s) => ({
        id: s.id,
        ip: s.ip,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        lastUsedAt: s.lastUsedAt,
      })),
      activity: activity.map((a) => ({
        id: a.id,
        action: a.action,
        result: a.result,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }
}
