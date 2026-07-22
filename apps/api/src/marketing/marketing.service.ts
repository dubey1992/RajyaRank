import { Injectable } from '@nestjs/common';
import type { UpsertTestimonial, UpsertFaq, UpsertStudyContentTeaser } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';

@Injectable()
export class MarketingService {
  constructor(private readonly prisma: PrismaService) {}

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
  createStudyContentTeaser(actorUserId: string, dto: UpsertStudyContentTeaser) {
    return this.prisma.studyContentTeaser.create({ data: { ...dto, createdBy: actorUserId } });
  }
  async updateStudyContentTeaser(id: string, dto: Partial<UpsertStudyContentTeaser>) {
    const row = await this.prisma.studyContentTeaser.findUnique({ where: { id } });
    if (!row) throw AppError.notFound('Study content teaser not found.');
    return this.prisma.studyContentTeaser.update({ where: { id }, data: dto });
  }
  async deleteStudyContentTeaser(id: string) {
    const row = await this.prisma.studyContentTeaser.findUnique({ where: { id } });
    if (!row) throw AppError.notFound('Study content teaser not found.');
    await this.prisma.studyContentTeaser.delete({ where: { id } });
    return { ok: true };
  }
}
