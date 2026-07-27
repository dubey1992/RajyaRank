import { Injectable } from '@nestjs/common';
import type { UpsertTestimonial, UpsertFaq, UpsertStudyContentTeaser } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { AppError } from '../common/errors/app-error';

@Injectable()
export class MarketingService {
  constructor(
    private readonly prisma: PrismaService,
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
}
