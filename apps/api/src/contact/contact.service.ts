import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type { ApiEnv } from '@rajyarank/config/env';
import type { ContactMessageView, SubmitContact } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { NotifierService } from '../notifications/notifier.service';
import { contactMessageNotifyEmail } from '../notifications/email-templates/internal-notifications';
import { ENV } from '../config/config.module';
import { AppError } from '../common/errors/app-error';

@Injectable()
export class ContactService {
  private readonly logger = new Logger('Contact');

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifier: NotifierService,
    @Inject(ENV) private readonly env: ApiEnv,
  ) {}

  private toView(row: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    category: string;
    message: string;
    status: string;
    createdAt: Date;
    resolvedAt: Date | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    referrerHost: string | null;
    landingPath: string | null;
  }): ContactMessageView {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      category: row.category as ContactMessageView['category'],
      message: row.message,
      status: row.status as ContactMessageView['status'],
      createdAt: row.createdAt.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      utmSource: row.utmSource,
      utmMedium: row.utmMedium,
      utmCampaign: row.utmCampaign,
      referrerHost: row.referrerHost,
      landingPath: row.landingPath,
    };
  }

  /** A filled honeypot field means a bot, not a real visitor — silently
   *  no-op instead of a 400, so scripted retries learn nothing. */
  async submit(dto: SubmitContact): Promise<{ ok: true }> {
    if (dto.hp) return { ok: true };

    await this.prisma.contactMessage.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.trim(),
        phone: dto.phone?.trim() || null,
        category: dto.category,
        message: dto.message.trim(),
        utmSource: dto.utmSource?.trim() || null,
        utmMedium: dto.utmMedium?.trim() || null,
        utmCampaign: dto.utmCampaign?.trim() || null,
        referrerHost: dto.referrerHost?.trim() || null,
        landingPath: dto.landingPath?.trim() || null,
      },
    });

    if (this.env.CONTACT_NOTIFY_EMAIL) {
      const { subject, html } = contactMessageNotifyEmail({
        name: dto.name.trim(),
        email: dto.email.trim(),
        phone: dto.phone?.trim() || null,
        category: dto.category,
        message: dto.message.trim(),
        adminUrl: `${this.env.ADMIN_PUBLIC_URL}/en/admin/support`,
      });
      await this.notifier.sendEmail({ to: this.env.CONTACT_NOTIFY_EMAIL, subject, html, locale: 'en' });
    } else {
      this.logger.warn('CONTACT_NOTIFY_EMAIL not set — contact message persisted but no email sent.');
    }

    return { ok: true };
  }

  async list(): Promise<ContactMessageView[]> {
    const rows = await this.prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((r) => this.toView(r));
  }

  async resolve(principal: Principal, id: string): Promise<ContactMessageView> {
    const existing = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Contact message not found.');
    const row = await this.prisma.contactMessage.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedBy: principal.userId, resolvedAt: new Date() },
    });
    return this.toView(row);
  }
}
