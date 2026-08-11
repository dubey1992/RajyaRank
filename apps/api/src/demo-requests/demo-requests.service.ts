import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type { ApiEnv } from '@rajyarank/config/env';
import type { DemoRequestView, SubmitDemoRequest } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { NotifierService } from '../notifications/notifier.service';
import { demoRequestNotifyEmail } from '../notifications/email-templates/internal-notifications';
import { ENV } from '../config/config.module';
import { AppError } from '../common/errors/app-error';

@Injectable()
export class DemoRequestsService {
  private readonly logger = new Logger('DemoRequests');

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifier: NotifierService,
    @Inject(ENV) private readonly env: ApiEnv,
  ) {}

  private toView(row: {
    id: string;
    institutionName: string;
    contactName: string;
    email: string;
    phone: string;
    role: string | null;
    city: string | null;
    studentCount: number | null;
    message: string | null;
    status: string;
    createdAt: Date;
    resolvedAt: Date | null;
  }): DemoRequestView {
    return {
      id: row.id,
      institutionName: row.institutionName,
      contactName: row.contactName,
      email: row.email,
      phone: row.phone,
      role: row.role,
      city: row.city,
      studentCount: row.studentCount,
      message: row.message,
      status: row.status as DemoRequestView['status'],
      createdAt: row.createdAt.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
    };
  }

  /** A filled honeypot field means a bot, not a real visitor — silently
   *  no-op instead of a 400, matching ContactService.submit()'s pattern. */
  async submit(dto: SubmitDemoRequest): Promise<{ ok: true }> {
    if (dto.hp) return { ok: true };

    await this.prisma.demoRequest.create({
      data: {
        institutionName: dto.institutionName.trim(),
        contactName: dto.contactName.trim(),
        email: dto.email.trim(),
        phone: dto.phone.trim(),
        role: dto.role?.trim() || null,
        city: dto.city?.trim() || null,
        studentCount: dto.studentCount ?? null,
        message: dto.message?.trim() || null,
      },
    });

    if (this.env.DEMO_NOTIFY_EMAIL) {
      const { subject, html } = demoRequestNotifyEmail({
        institutionName: dto.institutionName.trim(),
        contactName: dto.contactName.trim(),
        email: dto.email.trim(),
        phone: dto.phone.trim(),
        role: dto.role?.trim() || null,
        city: dto.city?.trim() || null,
        studentCount: dto.studentCount ?? null,
        message: dto.message?.trim() || null,
        adminUrl: `${this.env.ADMIN_PUBLIC_URL}/en/admin/support`,
      });
      await this.notifier.sendEmail({ to: this.env.DEMO_NOTIFY_EMAIL, subject, html, locale: 'en' });
    } else {
      this.logger.warn('DEMO_NOTIFY_EMAIL not set — demo request persisted but no email sent.');
    }

    return { ok: true };
  }

  async list(): Promise<DemoRequestView[]> {
    const rows = await this.prisma.demoRequest.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((r) => this.toView(r));
  }

  async resolve(principal: Principal, id: string): Promise<DemoRequestView> {
    const existing = await this.prisma.demoRequest.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Demo request not found.');
    const row = await this.prisma.demoRequest.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedBy: principal.userId, resolvedAt: new Date() },
    });
    return this.toView(row);
  }
}
