import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type { OfficialNoticeView, UpsertOfficialNotice } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthorizationService } from '../authz/authorization.service';
import { NotificationService } from '../notifications/notification.service';
import { AppError } from '../common/errors/app-error';

const EDITABLE_FROM = ['DRAFT', 'CORRECTION_REQUIRED'] as const;

type NoticeRow = {
  id: string;
  examId: string;
  noticeNumber: string;
  publishedDate: Date;
  sourceUrl: string | null;
  sourceAssetId: string | null;
  titleHi: string;
  titleEn: string;
  bodyHi: string;
  bodyEn: string;
  proposedApplicationDeadline: Date | null;
  proposedExamDate: Date | null;
  affectedConceptIds: string[];
  syllabusVersionTag: string | null;
  status: string;
  publishedAt: Date | null;
  correctionReason: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  exam: { nameHi: string; nameEn: string };
};

/** Official-notice maker/checker workflow (Phase 4, Notification-to-Action) —
 *  a right-sized subset of the shared ContentStatus enum, structurally
 *  identical to current-affairs.service.ts's flat, single-row content type
 *  (no versions, no course/topic hierarchy). On publish(), also updates the
 *  linked Exam's calendar fields, tags affected Concepts with a syllabus
 *  version, and notifies students targeting that exam — everything else
 *  (create/submit/correction/unpublish/archive) is the same maker/checker
 *  gate Current Affairs already uses. */
@Injectable()
export class OfficialNoticesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly authz: AuthorizationService,
    private readonly notifications: NotificationService,
  ) {}

  private toView(row: NoticeRow): OfficialNoticeView {
    return {
      id: row.id,
      examId: row.examId,
      examNameHi: row.exam.nameHi,
      examNameEn: row.exam.nameEn,
      noticeNumber: row.noticeNumber,
      publishedDate: row.publishedDate.toISOString(),
      sourceUrl: row.sourceUrl,
      sourceAssetId: row.sourceAssetId,
      titleHi: row.titleHi,
      titleEn: row.titleEn,
      bodyHi: row.bodyHi,
      bodyEn: row.bodyEn,
      proposedApplicationDeadline: row.proposedApplicationDeadline?.toISOString() ?? null,
      proposedExamDate: row.proposedExamDate?.toISOString() ?? null,
      affectedConceptIds: row.affectedConceptIds,
      syllabusVersionTag: row.syllabusVersionTag,
      status: row.status,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      correctionReason: row.correctionReason,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** No single @RequirePermission code covers both makers (content.create)
   *  and checkers (content.review) — same pattern current-affairs.service.ts
   *  already uses for this exact ambiguity. */
  private assertCanView(principal: Principal) {
    const canMake = this.authz.check(principal, 'content.create').allow;
    const canCheck = this.authz.check(principal, 'content.review').allow;
    if (!canMake && !canCheck) throw AppError.permissionDenied();
  }

  private async validateConceptsBelongToExam(examId: string, conceptIds: string[]): Promise<void> {
    if (!conceptIds.length) return;
    const concepts = await this.prisma.concept.findMany({ where: { id: { in: conceptIds } }, select: { id: true, examId: true } });
    if (concepts.length !== conceptIds.length) throw AppError.notFound('One or more concepts not found.');
    if (concepts.some((c) => c.examId !== examId)) throw AppError.conflict('All affected concepts must belong to this notice’s exam.');
  }

  async list(principal: Principal): Promise<OfficialNoticeView[]> {
    this.assertCanView(principal);
    const rows = await this.prisma.officialNotice.findMany({
      orderBy: [{ publishedDate: 'desc' }, { createdAt: 'desc' }],
      include: { exam: { select: { nameHi: true, nameEn: true } } },
    });
    return rows.map((r) => this.toView(r));
  }

  async create(principal: Principal, dto: UpsertOfficialNotice): Promise<OfficialNoticeView> {
    const exam = await this.prisma.exam.findUnique({ where: { id: dto.examId } });
    if (!exam) throw AppError.notFound('Exam not found.');
    await this.validateConceptsBelongToExam(dto.examId, dto.affectedConceptIds);

    const row = await this.prisma.officialNotice.create({
      data: {
        examId: dto.examId,
        noticeNumber: dto.noticeNumber,
        publishedDate: new Date(dto.publishedDate),
        sourceUrl: dto.sourceUrl ?? null,
        sourceAssetId: dto.sourceAssetId ?? null,
        titleHi: dto.titleHi,
        titleEn: dto.titleEn,
        bodyHi: dto.bodyHi,
        bodyEn: dto.bodyEn,
        proposedApplicationDeadline: dto.proposedApplicationDeadline ? new Date(dto.proposedApplicationDeadline) : null,
        proposedExamDate: dto.proposedExamDate ? new Date(dto.proposedExamDate) : null,
        affectedConceptIds: dto.affectedConceptIds,
        syllabusVersionTag: dto.syllabusVersionTag ?? null,
        status: 'DRAFT',
        createdBy: principal.userId,
      },
      include: { exam: { select: { nameHi: true, nameEn: true } } },
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'official_notice.created', targetType: 'OfficialNotice', targetId: row.id, result: 'SUCCESS' });
    return this.toView(row);
  }

  async update(principal: Principal, id: string, dto: Partial<UpsertOfficialNotice>): Promise<OfficialNoticeView> {
    const existing = await this.prisma.officialNotice.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Official notice not found.');
    if (!EDITABLE_FROM.includes(existing.status as (typeof EDITABLE_FROM)[number])) {
      throw AppError.contentStateInvalid('Only draft or correction-required notices can be edited.');
    }
    if (dto.examId !== undefined && dto.examId !== existing.examId) {
      const exam = await this.prisma.exam.findUnique({ where: { id: dto.examId } });
      if (!exam) throw AppError.notFound('Exam not found.');
    }
    // Re-validate concept ownership whenever EITHER the exam or the concept
    // list changes — changing just the exam without touching concepts would
    // otherwise leave affectedConceptIds silently pointing at the old exam's
    // concepts (publish() re-checks this too, but failing fast here at edit
    // time is the honest place to catch it).
    if (dto.affectedConceptIds !== undefined || (dto.examId !== undefined && dto.examId !== existing.examId)) {
      await this.validateConceptsBelongToExam(dto.examId ?? existing.examId, dto.affectedConceptIds ?? existing.affectedConceptIds);
    }
    const row = await this.prisma.officialNotice.update({
      where: { id },
      data: {
        ...(dto.examId !== undefined ? { examId: dto.examId } : {}),
        ...(dto.noticeNumber !== undefined ? { noticeNumber: dto.noticeNumber } : {}),
        ...(dto.publishedDate !== undefined ? { publishedDate: new Date(dto.publishedDate) } : {}),
        ...(dto.sourceUrl !== undefined ? { sourceUrl: dto.sourceUrl } : {}),
        ...(dto.sourceAssetId !== undefined ? { sourceAssetId: dto.sourceAssetId } : {}),
        ...(dto.titleHi !== undefined ? { titleHi: dto.titleHi } : {}),
        ...(dto.titleEn !== undefined ? { titleEn: dto.titleEn } : {}),
        ...(dto.bodyHi !== undefined ? { bodyHi: dto.bodyHi } : {}),
        ...(dto.bodyEn !== undefined ? { bodyEn: dto.bodyEn } : {}),
        ...(dto.proposedApplicationDeadline !== undefined ? { proposedApplicationDeadline: dto.proposedApplicationDeadline ? new Date(dto.proposedApplicationDeadline) : null } : {}),
        ...(dto.proposedExamDate !== undefined ? { proposedExamDate: dto.proposedExamDate ? new Date(dto.proposedExamDate) : null } : {}),
        ...(dto.affectedConceptIds !== undefined ? { affectedConceptIds: dto.affectedConceptIds } : {}),
        ...(dto.syllabusVersionTag !== undefined ? { syllabusVersionTag: dto.syllabusVersionTag } : {}),
      },
      include: { exam: { select: { nameHi: true, nameEn: true } } },
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'official_notice.updated', targetType: 'OfficialNotice', targetId: id, result: 'SUCCESS', after: dto });
    return this.toView(row);
  }

  async submit(principal: Principal, id: string): Promise<OfficialNoticeView> {
    const existing = await this.prisma.officialNotice.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Official notice not found.');
    if (!EDITABLE_FROM.includes(existing.status as (typeof EDITABLE_FROM)[number])) {
      throw AppError.contentStateInvalid('Only draft or correction-required notices can be submitted.');
    }
    const row = await this.prisma.officialNotice.update({
      where: { id },
      data: { status: 'SUBMITTED', correctionReason: null },
      include: { exam: { select: { nameHi: true, nameEn: true } } },
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'official_notice.submitted', targetType: 'OfficialNotice', targetId: id, result: 'SUCCESS' });
    return this.toView(row);
  }

  async requestCorrection(principal: Principal, id: string, body: string): Promise<OfficialNoticeView> {
    const existing = await this.prisma.officialNotice.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Official notice not found.');
    if (existing.status !== 'SUBMITTED') throw AppError.contentStateInvalid('Only submitted notices can be sent back for correction.');
    const row = await this.prisma.officialNotice.update({
      where: { id },
      data: { status: 'CORRECTION_REQUIRED', correctionReason: body },
      include: { exam: { select: { nameHi: true, nameEn: true } } },
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'official_notice.correction_requested', targetType: 'OfficialNotice', targetId: id, result: 'SUCCESS', after: { reason: body } });
    return this.toView(row);
  }

  /** Publishing here — unlike Current Affairs — has real downstream effects:
   *  the linked Exam's calendar, the affected Concepts' syllabus version, and
   *  an exam-scoped (not platform-wide) student notification. A maker can
   *  never reach this: it requires status SUBMITTED, which only a checker's
   *  own action (submit() is maker-only, this is content.publish-gated) can
   *  produce, and self-publish is impossible since content.create and
   *  content.publish are never held by the same role. */
  async publish(principal: Principal, id: string): Promise<OfficialNoticeView> {
    const existing = await this.prisma.officialNotice.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Official notice not found.');
    if (existing.status !== 'SUBMITTED') throw AppError.contentStateInvalid('Only submitted notices can be published.');
    await this.validateConceptsBelongToExam(existing.examId, existing.affectedConceptIds);

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.officialNotice.update({
        where: { id },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
        include: { exam: { select: { nameHi: true, nameEn: true } } },
      });

      if (existing.proposedApplicationDeadline || existing.proposedExamDate) {
        await tx.exam.update({
          where: { id: existing.examId },
          data: {
            ...(existing.proposedApplicationDeadline ? { applicationDeadline: existing.proposedApplicationDeadline } : {}),
            ...(existing.proposedExamDate ? { examDate: existing.proposedExamDate } : {}),
          },
        });
      }

      if (existing.syllabusVersionTag && existing.affectedConceptIds.length) {
        await tx.concept.updateMany({
          where: { id: { in: existing.affectedConceptIds } },
          data: { syllabusVersion: existing.syllabusVersionTag },
        });
      }

      return updated;
    });

    await this.audit.record({ actorUserId: principal.userId, action: 'official_notice.published', targetType: 'OfficialNotice', targetId: id, result: 'SUCCESS' });

    const students = await this.prisma.studentProfile.findMany({ where: { targetExamId: existing.examId }, select: { userId: true } });
    await Promise.all(
      students.map(({ userId }) =>
        this.notifications.emit({
          userId,
          category: 'EXAM_NOTICE',
          titleHi: row.titleHi,
          titleEn: row.titleEn,
          bodyHi: row.bodyHi,
          bodyEn: row.bodyEn,
          data: { officialNoticeId: row.id, examId: row.examId },
        }),
      ),
    );

    return this.toView(row);
  }

  async unpublish(principal: Principal, id: string, reason: string): Promise<OfficialNoticeView> {
    const existing = await this.prisma.officialNotice.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Official notice not found.');
    if (existing.status !== 'PUBLISHED') throw AppError.contentStateInvalid('Only published notices can be unpublished.');
    const row = await this.prisma.officialNotice.update({
      where: { id },
      data: { status: 'UNPUBLISHED' },
      include: { exam: { select: { nameHi: true, nameEn: true } } },
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'official_notice.unpublished', targetType: 'OfficialNotice', targetId: id, result: 'SUCCESS', after: { reason } });
    return this.toView(row);
  }

  async archive(principal: Principal, id: string): Promise<OfficialNoticeView> {
    const existing = await this.prisma.officialNotice.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Official notice not found.');
    if (!['DRAFT', 'CORRECTION_REQUIRED', 'UNPUBLISHED'].includes(existing.status)) {
      throw AppError.contentStateInvalid('Only draft, correction-required or unpublished notices can be archived.');
    }
    const row = await this.prisma.officialNotice.update({
      where: { id },
      data: { status: 'ARCHIVED' },
      include: { exam: { select: { nameHi: true, nameEn: true } } },
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'official_notice.archived', targetType: 'OfficialNotice', targetId: id, result: 'SUCCESS' });
    return this.toView(row);
  }
}
