import { Injectable } from '@nestjs/common';
import type { NotificationCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotifierService } from './notifier.service';

export interface EmitInput {
  userId: string;
  category: NotificationCategory;
  titleHi: string;
  titleEn: string;
  bodyHi?: string;
  bodyEn?: string;
  data?: Record<string, unknown>;
  /** Either pre-built HTML, or a builder run against the recipient's own
   *  locale — lets callers use the bilingual email-template functions without
   *  needing to look up the user's locale themselves. */
  email?: { subject: string; html: string } | ((locale: 'hi' | 'en') => { subject: string; html: string });
  sms?: { text: string };
}

/** Essential categories are always delivered and can never be muted. */
const ESSENTIAL: NotificationCategory[] = ['SECURITY', 'PAYMENT'];

/**
 * Higher-level notifications: always writes an in-app record (unless muted &
 * non-essential), then dispatches email/SMS honouring the user's preferences.
 * Users control non-essential channels/categories via NotificationPreference.
 */
@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifier: NotifierService,
  ) {}

  async emit(input: EmitInput): Promise<void> {
    const essential = ESSENTIAL.includes(input.category);
    const pref = await this.prisma.notificationPreference.findUnique({ where: { userId: input.userId } });
    const muted = pref?.mutedCategories?.includes(input.category) ?? false;

    if (essential || !muted) {
      await this.prisma.notification.create({
        data: {
          userId: input.userId,
          category: input.category,
          titleHi: input.titleHi,
          titleEn: input.titleEn,
          bodyHi: input.bodyHi ?? null,
          bodyEn: input.bodyEn ?? null,
          data: (input.data as object) ?? undefined,
        },
      });
    }

    const user = await this.prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) return;
    const locale: 'hi' | 'en' = user.locale === 'en' ? 'en' : 'hi';

    if (input.email && user.email && (essential || pref?.emailEnabled !== false) && (essential || !muted)) {
      const built = typeof input.email === 'function' ? input.email(locale) : input.email;
      await this.notifier.sendEmail({ to: user.email, subject: built.subject, html: built.html, locale });
    }
    if (input.sms && user.phone && (essential || pref?.smsEnabled) && (essential || !muted)) {
      await this.notifier.sendSms(user.phone, input.sms.text);
    }
  }

  async list(userId: string) {
    const items = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return items.map((n) => ({
      id: n.id,
      category: n.category,
      titleHi: n.titleHi,
      titleEn: n.titleEn,
      bodyHi: n.bodyHi,
      bodyEn: n.bodyEn,
      read: Boolean(n.readAt),
      createdAt: n.createdAt.toISOString(),
    }));
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
    return { read: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return { read: true };
  }

  async getPreferences(userId: string) {
    const pref = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    return {
      emailEnabled: pref?.emailEnabled ?? true,
      smsEnabled: pref?.smsEnabled ?? false,
      pushEnabled: pref?.pushEnabled ?? true,
      mutedCategories: pref?.mutedCategories ?? [],
    };
  }

  async setPreferences(userId: string, dto: { emailEnabled: boolean; smsEnabled: boolean; pushEnabled: boolean; mutedCategories: string[] }) {
    await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });
    return this.getPreferences(userId);
  }
}
