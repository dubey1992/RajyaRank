import { Injectable } from '@nestjs/common';
import type { UpsertTestimonial, UpsertFaq, UpsertStudyContentTeaser, SendBroadcastEmail, BroadcastAudienceValue, BroadcastEmailResult } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { promotionalEmail } from '../notifications/email-templates/marketing';
import { AppError } from '../common/errors/app-error';

/** Hard ceiling on a single broadcast's recipient count — a safety backstop
 *  against an accidental full-table send, not a real product limit at this
 *  user scale. If the audience genuinely exceeds this, the send is truncated
 *  and BroadcastEmailResult.truncated tells the caller so (never silently). */
const AUDIENCE_CAP = 5000;

@Injectable()
export class MarketingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {}

  // ── Testimonials ──
  publicTestimonials() {
    return this.prisma.testimonial.findMany({ where: { published: true }, orderBy: { sequence: 'asc' } });
  }
  adminListTestimonials() {
    return this.prisma.testimonial.findMany({ orderBy: { sequence: 'asc' } });
  }
  createTestimonial(actorUserId: string, dto: UpsertTestimonial) {
    return this.prisma.testimonial.create({ data: { ...dto, createdBy: actorUserId } });
  }
  async updateTestimonial(id: string, dto: Partial<UpsertTestimonial>) {
    const row = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!row) throw AppError.notFound('Testimonial not found.');
    return this.prisma.testimonial.update({ where: { id }, data: dto });
  }
  async deleteTestimonial(id: string) {
    const row = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!row) throw AppError.notFound('Testimonial not found.');
    await this.prisma.testimonial.delete({ where: { id } });
    return { ok: true };
  }

  // ── FAQs ──
  publicFaqs() {
    return this.prisma.faq.findMany({ where: { published: true }, orderBy: { sequence: 'asc' } });
  }
  adminListFaqs() {
    return this.prisma.faq.findMany({ orderBy: { sequence: 'asc' } });
  }
  createFaq(actorUserId: string, dto: UpsertFaq) {
    return this.prisma.faq.create({ data: { ...dto, createdBy: actorUserId } });
  }
  async updateFaq(id: string, dto: Partial<UpsertFaq>) {
    const row = await this.prisma.faq.findUnique({ where: { id } });
    if (!row) throw AppError.notFound('FAQ not found.');
    return this.prisma.faq.update({ where: { id }, data: dto });
  }
  async deleteFaq(id: string) {
    const row = await this.prisma.faq.findUnique({ where: { id } });
    if (!row) throw AppError.notFound('FAQ not found.');
    await this.prisma.faq.delete({ where: { id } });
    return { ok: true };
  }

  // ── Study content teasers ──
  publicStudyContentTeasers() {
    return this.prisma.studyContentTeaser.findMany({ where: { published: true }, orderBy: { sequence: 'asc' } });
  }
  adminListStudyContentTeasers() {
    return this.prisma.studyContentTeaser.findMany({ orderBy: { sequence: 'asc' } });
  }
  async createStudyContentTeaser(actorUserId: string, dto: UpsertStudyContentTeaser) {
    const row = await this.prisma.studyContentTeaser.create({ data: { ...dto, createdBy: actorUserId } });
    if (row.published) await this.notifyNewContent(row);
    return row;
  }
  async updateStudyContentTeaser(id: string, dto: Partial<UpsertStudyContentTeaser>) {
    const existing = await this.prisma.studyContentTeaser.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Study content teaser not found.');
    const row = await this.prisma.studyContentTeaser.update({ where: { id }, data: dto });
    // Only the false→true edge notifies — re-saving an already-published
    // teaser (e.g. a typo fix) shouldn't re-blast every student.
    if (dto.published === true && !existing.published) await this.notifyNewContent(row);
    return row;
  }
  private async notifyNewContent(row: { id: string; titleHi: string; titleEn: string }) {
    const students = await this.prisma.user.findMany({ where: { kind: 'STUDENT', status: 'ACTIVE', deletedAt: null }, select: { id: true } });
    await Promise.all(
      students.map(({ id: userId }) =>
        this.notifications.emit({
          userId,
          category: 'NEW_CONTENT',
          titleHi: 'नई अध्ययन सामग्री',
          titleEn: 'New study content',
          bodyHi: row.titleHi,
          bodyEn: row.titleEn,
          data: { studyContentTeaserId: row.id },
        }),
      ),
    );
  }
  async deleteStudyContentTeaser(id: string) {
    const row = await this.prisma.studyContentTeaser.findUnique({ where: { id } });
    if (!row) throw AppError.notFound('Study content teaser not found.');
    await this.prisma.studyContentTeaser.delete({ where: { id } });
    return { ok: true };
  }

  // ── Promotional email broadcast (Super Admin only) ──
  private async audienceUserIds(audience: BroadcastAudienceValue): Promise<string[]> {
    if (audience === 'ALL_STUDENTS') {
      const rows = await this.prisma.user.findMany({ where: { kind: 'STUDENT', status: 'ACTIVE', deletedAt: null }, select: { id: true } });
      return rows.map((r) => r.id);
    }
    if (audience === 'ALL_STAFF') {
      const rows = await this.prisma.user.findMany({ where: { kind: 'STAFF', status: 'ACTIVE', deletedAt: null }, select: { id: true } });
      return rows.map((r) => r.id);
    }
    const rows = await this.prisma.user.findMany({
      where: { kind: 'STAFF', status: 'ACTIVE', deletedAt: null, roles: { some: { role: { key: 'ACADEMIC_HEAD' } } } },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async broadcastAudienceCount(audience: BroadcastAudienceValue): Promise<number> {
    return (await this.audienceUserIds(audience)).length;
  }

  /** Queues one promotional email per recipient in the chosen audience, via
   *  NotificationService.emit (category ANNOUNCEMENT) so it honors each
   *  recipient's own mute/emailEnabled preference and leaves an in-app
   *  Notification record — the same path every other user-facing email in
   *  the app already goes through, just fanned out across a whole segment
   *  instead of one user. */
  async sendBroadcastEmail(actorUserId: string, dto: SendBroadcastEmail): Promise<BroadcastEmailResult> {
    const ids = await this.audienceUserIds(dto.audience);
    const truncated = ids.length > AUDIENCE_CAP;
    const targetIds = truncated ? ids.slice(0, AUDIENCE_CAP) : ids;
    const email = promotionalEmail(dto.subject, dto.message, dto.ctaLabel && dto.ctaHref ? { label: dto.ctaLabel, href: dto.ctaHref } : undefined);

    let queued = 0;
    let skippedMuted = 0;
    for (const userId of targetIds) {
      const pref = await this.prisma.notificationPreference.findUnique({ where: { userId } });
      if (pref?.mutedCategories?.includes('ANNOUNCEMENT') || pref?.emailEnabled === false) {
        skippedMuted++;
        continue;
      }
      await this.notifications.emit({
        userId,
        category: 'ANNOUNCEMENT',
        titleHi: dto.subject,
        titleEn: dto.subject,
        bodyHi: dto.message,
        bodyEn: dto.message,
        email,
      });
      queued++;
    }

    await this.audit.record({
      actorUserId,
      action: 'marketing.broadcast_sent',
      targetType: 'Broadcast',
      targetId: dto.audience,
      result: 'SUCCESS',
      after: { audience: dto.audience, subject: dto.subject, queued, skippedMuted, truncated },
    });
    return { queued, skippedMuted, truncated };
  }
}
