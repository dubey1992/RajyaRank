import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type { AnnouncementView, CreateAnnouncement } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { announcementEmail } from '../notifications/email-templates/engagement';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {}

  async list(): Promise<AnnouncementView[]> {
    const rows = await this.prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    return rows.map(toView);
  }

  async send(actor: Principal, dto: CreateAnnouncement): Promise<AnnouncementView> {
    const recipients = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        ...(dto.audience === 'ALL' ? {} : { kind: dto.audience === 'STUDENTS' ? 'STUDENT' : 'STAFF' }),
      },
      select: { id: true },
    });

    await Promise.all(
      recipients.map(({ id }) =>
        this.notifications.emit({
          userId: id,
          category: 'ANNOUNCEMENT',
          titleHi: dto.titleHi,
          titleEn: dto.titleEn,
          bodyHi: dto.bodyHi,
          bodyEn: dto.bodyEn,
          email: (locale) => announcementEmail(locale, dto.titleHi, dto.titleEn, dto.bodyHi, dto.bodyEn),
        }),
      ),
    );

    const announcement = await this.prisma.announcement.create({
      data: {
        titleHi: dto.titleHi,
        titleEn: dto.titleEn,
        bodyHi: dto.bodyHi,
        bodyEn: dto.bodyEn,
        audience: dto.audience,
        recipientCount: recipients.length,
        sentBy: actor.userId,
      },
    });
    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roleKeys.join(','),
      action: 'announcement.sent',
      targetType: 'Announcement',
      targetId: announcement.id,
      result: 'SUCCESS',
      after: { audience: dto.audience, recipientCount: recipients.length },
    });
    return toView(announcement);
  }
}

function toView(a: {
  id: string;
  titleHi: string;
  titleEn: string;
  bodyHi: string;
  bodyEn: string;
  audience: string;
  recipientCount: number;
  createdAt: Date;
}): AnnouncementView {
  return {
    id: a.id,
    titleHi: a.titleHi,
    titleEn: a.titleEn,
    bodyHi: a.bodyHi,
    bodyEn: a.bodyEn,
    audience: a.audience as AnnouncementView['audience'],
    recipientCount: a.recipientCount,
    createdAt: a.createdAt.toISOString(),
  };
}
