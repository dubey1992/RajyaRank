import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type { CreateDoubt, DoubtReplyInput } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { doubtAnsweredEmail } from '../notifications/email-templates/support';
import { AppError } from '../common/errors/app-error';

@Injectable()
export class DoubtsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {}

  private studentId(p: Principal): string {
    if (p.kind !== 'STUDENT') throw AppError.permissionDenied('Student account required.');
    return p.userId;
  }

  async create(p: Principal, dto: CreateDoubt) {
    const studentId = this.studentId(p);
    const doubt = await this.prisma.doubt.create({
      data: {
        studentId,
        orgId: p.orgId ?? null,
        subjectId: dto.subjectId ?? null,
        lessonId: dto.lessonId ?? null,
        questionVersionId: dto.questionVersionId ?? null,
        testVersionId: dto.testVersionId ?? null,
        bodyText: dto.bodyText,
        imageAssetId: dto.imageAssetId ?? null,
      },
    });
    await this.audit.record({ actorUserId: studentId, action: 'doubt.created', targetType: 'Doubt', targetId: doubt.id, result: 'SUCCESS' });
    return this.view(doubt.id);
  }

  async listMine(p: Principal) {
    const studentId = this.studentId(p);
    return this.prisma.doubt
      .findMany({ where: { studentId }, orderBy: { updatedAt: 'desc' }, include: { replies: { orderBy: { createdAt: 'asc' } } }, take: 100 })
      .then((ds) => ds.map(toView));
  }

  async reopen(p: Principal, id: string) {
    const studentId = this.studentId(p);
    const doubt = await this.prisma.doubt.findFirst({ where: { id, studentId } });
    if (!doubt) throw AppError.notFound('Doubt not found.');
    if (!['ANSWERED', 'RESOLVED', 'CLOSED'].includes(doubt.status)) throw AppError.contentStateInvalid();
    await this.prisma.doubt.update({ where: { id }, data: { status: 'REOPENED' } });
    return this.view(id);
  }

  // ── Staff (doubt.respond) ──
  async staffQueue(p: Principal) {
    const orgScoped = !p.isSuperAdmin && !!p.orgId;
    return this.prisma.doubt
      .findMany({
        where: { status: { in: ['OPEN', 'ASSIGNED', 'REOPENED'] }, ...(orgScoped ? { orgId: p.orgId } : {}) },
        orderBy: { createdAt: 'asc' },
        include: { replies: { orderBy: { createdAt: 'asc' } } },
        take: 100,
      })
      .then((ds) => ds.map(toView));
  }

  async assign(p: Principal, id: string, assignedToUserId: string) {
    await this.requireDoubt(id);
    await this.prisma.doubt.update({ where: { id }, data: { assignedToUserId, status: 'ASSIGNED' } });
    await this.audit.record({ actorUserId: p.userId, action: 'doubt.assigned', targetType: 'Doubt', targetId: id, result: 'SUCCESS', after: { assignedToUserId } });
    return this.view(id);
  }

  async reply(p: Principal, id: string, dto: DoubtReplyInput) {
    const doubt = await this.requireDoubt(id);
    await this.prisma.$transaction([
      this.prisma.doubtReply.create({
        data: { doubtId: id, authorUserId: p.userId, bodyText: dto.bodyText, imageAssetId: dto.imageAssetId ?? null, videoAssetId: dto.videoAssetId ?? null, lessonRefId: dto.lessonRefId ?? null },
      }),
      this.prisma.doubt.update({ where: { id }, data: { status: 'ANSWERED' } }),
    ]);
    // Notify the student their doubt was answered.
    await this.notifications.emit({
      userId: doubt.studentId,
      category: 'DOUBT_ANSWER',
      titleHi: 'आपके प्रश्न का उत्तर मिला',
      titleEn: 'Your doubt has been answered',
      bodyHi: 'शिक्षक ने आपके प्रश्न का उत्तर दिया है।',
      bodyEn: 'A teacher has responded to your doubt.',
      data: { doubtId: id },
      email: (locale) => doubtAnsweredEmail(locale),
    });
    await this.audit.record({ actorUserId: p.userId, action: 'doubt.answered', targetType: 'Doubt', targetId: id, result: 'SUCCESS' });
    return this.view(id);
  }

  async resolve(p: Principal, id: string) {
    await this.requireDoubt(id);
    await this.prisma.doubt.update({ where: { id }, data: { status: 'RESOLVED', resolvedAt: new Date() } });
    return this.view(id);
  }

  private async requireDoubt(id: string) {
    const doubt = await this.prisma.doubt.findUnique({ where: { id } });
    if (!doubt) throw AppError.notFound('Doubt not found.');
    return doubt;
  }

  private async view(id: string) {
    const doubt = await this.prisma.doubt.findUniqueOrThrow({ where: { id }, include: { replies: { orderBy: { createdAt: 'asc' } } } });
    return toView(doubt);
  }
}

function toView(d: {
  id: string;
  bodyText: string;
  status: string;
  subjectId: string | null;
  lessonId: string | null;
  assignedToUserId: string | null;
  createdAt: Date;
  replies: { id: string; authorUserId: string; bodyText: string; createdAt: Date }[];
}) {
  return {
    id: d.id,
    bodyText: d.bodyText,
    status: d.status,
    subjectId: d.subjectId,
    lessonId: d.lessonId,
    assignedToUserId: d.assignedToUserId,
    createdAt: d.createdAt.toISOString(),
    replies: d.replies.map((r) => ({ id: r.id, authorUserId: r.authorUserId, bodyText: r.bodyText, createdAt: r.createdAt.toISOString() })),
  };
}
