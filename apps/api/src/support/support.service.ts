import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type { CreateTicket } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { supportReplyEmail, supportStatusChangedEmail } from '../notifications/email-templates/support';
import { AppError } from '../common/errors/app-error';

/**
 * Support tickets. Support agents operate under least privilege — they see the
 * ticket + the student id, never payment credentials or academic content.
 * Internal replies are hidden from the student.
 */
@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {}

  private studentId(p: Principal): string {
    if (p.kind !== 'STUDENT') throw AppError.permissionDenied('Student account required.');
    return p.userId;
  }

  async create(p: Principal, dto: CreateTicket) {
    const studentId = this.studentId(p);
    const ticket = await this.prisma.supportTicket.create({
      data: { studentId, orgId: p.orgId ?? null, category: dto.category, subject: dto.subject, bodyText: dto.bodyText },
    });
    await this.audit.record({ actorUserId: studentId, action: 'support.ticket_created', targetType: 'SupportTicket', targetId: ticket.id, result: 'SUCCESS' });
    return this.view(ticket.id, false);
  }

  async listMine(p: Principal) {
    const studentId = this.studentId(p);
    const tickets = await this.prisma.supportTicket.findMany({
      where: { studentId },
      orderBy: { updatedAt: 'desc' },
      include: { replies: { where: { internal: false }, orderBy: { createdAt: 'asc' } } },
      take: 100,
    });
    return tickets.map((t) => toView(t));
  }

  async studentReply(p: Principal, id: string, bodyText: string) {
    const studentId = this.studentId(p);
    const ticket = await this.prisma.supportTicket.findFirst({ where: { id, studentId } });
    if (!ticket) throw AppError.notFound('Ticket not found.');
    await this.prisma.$transaction([
      this.prisma.ticketReply.create({ data: { ticketId: id, authorUserId: studentId, bodyText, internal: false } }),
      this.prisma.supportTicket.update({ where: { id }, data: { status: 'IN_PROGRESS' } }),
    ]);
    return this.view(id, false);
  }

  // ── Staff (support.manage) ──
  async staffList(p: Principal, status?: string) {
    const orgScoped = !p.isSuperAdmin && !!p.orgId;
    const tickets = await this.prisma.supportTicket.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(orgScoped ? { orgId: p.orgId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: { replies: { orderBy: { createdAt: 'asc' } } },
      take: 100,
    });
    return tickets.map((t) => toView(t));
  }

  async staffReply(p: Principal, id: string, bodyText: string, internal: boolean) {
    const ticket = await this.requireTicket(p, id);
    await this.prisma.$transaction([
      this.prisma.ticketReply.create({ data: { ticketId: id, authorUserId: p.userId, bodyText, internal } }),
      this.prisma.supportTicket.update({ where: { id }, data: { status: internal ? ticket.status : 'WAITING_ON_STUDENT' } }),
    ]);
    if (!internal) {
      await this.notifications.emit({
        userId: ticket.studentId,
        category: 'SUPPORT',
        titleHi: 'सपोर्ट टिकट अपडेट',
        titleEn: 'Support ticket update',
        bodyHi: 'आपके सपोर्ट टिकट पर उत्तर मिला है।',
        bodyEn: 'There is a new reply on your support ticket.',
        data: { ticketId: id },
        email: (locale) => supportReplyEmail(locale),
      });
    }
    await this.audit.record({ actorUserId: p.userId, action: 'support.reply', targetType: 'SupportTicket', targetId: id, result: 'SUCCESS', after: { internal } });
    return this.view(id, true);
  }

  async setStatus(p: Principal, id: string, status: string) {
    const ticket = await this.requireTicket(p, id);
    await this.prisma.supportTicket.update({ where: { id }, data: { status: status as never } });
    await this.notifications.emit({
      userId: ticket.studentId,
      category: 'SUPPORT',
      titleHi: 'सपोर्ट टिकट की स्थिति बदली',
      titleEn: 'Support ticket status changed',
      bodyHi: `आपके सपोर्ट टिकट की स्थिति अब है: ${status}`,
      bodyEn: `Your support ticket status is now: ${status}`,
      data: { ticketId: id },
      email: (locale) => supportStatusChangedEmail(locale, status),
    });
    await this.audit.record({ actorUserId: p.userId, action: 'support.status_change', targetType: 'SupportTicket', targetId: id, result: 'SUCCESS', after: { status } });
    return this.view(id, true);
  }

  private async requireTicket(p: Principal, id: string) {
    const orgScoped = !p.isSuperAdmin && !!p.orgId;
    const ticket = await this.prisma.supportTicket.findFirst({ where: { id, ...(orgScoped ? { orgId: p.orgId } : {}) } });
    if (!ticket) throw AppError.notFound('Ticket not found.');
    return ticket;
  }

  private async view(id: string, includeInternal: boolean) {
    const ticket = await this.prisma.supportTicket.findUniqueOrThrow({
      where: { id },
      include: { replies: { where: includeInternal ? {} : { internal: false }, orderBy: { createdAt: 'asc' } } },
    });
    return toView(ticket);
  }
}

function toView(t: {
  id: string;
  category: string;
  subject: string;
  status: string;
  createdAt: Date;
  replies: { id: string; authorUserId: string; bodyText: string; internal: boolean; createdAt: Date }[];
}) {
  return {
    id: t.id,
    category: t.category,
    subject: t.subject,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    replies: t.replies.map((r) => ({ id: r.id, authorUserId: r.authorUserId, bodyText: r.bodyText, internal: r.internal, createdAt: r.createdAt.toISOString() })),
  };
}
