import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type { CreatePyqPaper, PyqPaperDownload, PyqPaperView, StudentPyqPaperListItem } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../authz/authorization.service';
import { AuditService } from '../audit/audit.service';
import { S3Service } from '../s3/s3.service';
import { AppError } from '../common/errors/app-error';

type PaperRow = {
  id: string;
  examId: string;
  titleHi: string;
  titleEn: string;
  year: number;
  status: string;
  createdBy: string;
  createdAt: Date;
  publishedAt: Date | null;
  exam: { nameHi: string; nameEn: string };
};

/** Previous-year exam papers (PDF uploads) — flat, single-row content type
 *  like OfficialNotice, but with a real MediaAsset FK. Goes through the same
 *  DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED -> PUBLISHED pipeline
 *  question-bank.service.ts uses for Questions, so the shared policy
 *  engine's STATUS_ALLOWS map (content.review only acts on
 *  SUBMITTED/UNDER_REVIEW, content.approve only on UNDER_REVIEW,
 *  content.publish only on APPROVED) is actually enforced — unlike
 *  OfficialNotice, whose service never passes a status into authz.check(). */
@Injectable()
export class PreviousYearPapersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
    private readonly audit: AuditService,
    private readonly s3: S3Service,
  ) {}

  private authorize(principal: Principal, permission: string, status?: string) {
    const decision = this.authz.check(principal, permission, { type: 'pyq_paper', status });
    if (!decision.allow) throw AppError.permissionDenied(decision.reason);
  }

  private toView(row: PaperRow): PyqPaperView {
    return {
      id: row.id,
      examId: row.examId,
      examNameHi: row.exam.nameHi,
      examNameEn: row.exam.nameEn,
      titleHi: row.titleHi,
      titleEn: row.titleEn,
      year: row.year,
      status: row.status,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      publishedAt: row.publishedAt?.toISOString() ?? null,
    };
  }

  async create(principal: Principal, dto: CreatePyqPaper): Promise<PyqPaperView> {
    this.authorize(principal, 'content.create');
    const exam = await this.prisma.exam.findUnique({ where: { id: dto.examId } });
    if (!exam) throw AppError.notFound('Exam not found.');
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: dto.assetId } });
    if (!asset || asset.status !== 'READY') throw AppError.conflict('Asset not found or not ready.');

    const row = await this.prisma.previousYearPaper.create({
      data: {
        examId: dto.examId,
        orgId: principal.orgId ?? null,
        titleHi: dto.titleHi,
        titleEn: dto.titleEn,
        year: dto.year,
        assetId: dto.assetId,
        status: 'DRAFT',
        createdBy: principal.userId,
      },
      include: { exam: { select: { nameHi: true, nameEn: true } } },
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'pyq_paper.created', targetType: 'PreviousYearPaper', targetId: row.id, result: 'SUCCESS' });
    return this.toView(row);
  }

  /** Org-scoped list: own institute's papers + platform-wide (orgId: null)
   *  ones — same "own org's rows OR platform-wide" pattern
   *  question-bank.service.ts's list() uses for Questions/Courses. */
  async list(principal: Principal): Promise<PyqPaperView[]> {
    this.authorize(principal, 'content.create');
    const orgScoped = !principal.isSuperAdmin && !!principal.orgId;
    const rows = await this.prisma.previousYearPaper.findMany({
      where: {
        deletedAt: null,
        ...(orgScoped ? { OR: [{ orgId: principal.orgId }, { orgId: null }] } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { exam: { select: { nameHi: true, nameEn: true } } },
    });
    return rows.map((r) => this.toView(r));
  }

  async submit(principal: Principal, id: string): Promise<PyqPaperView> {
    const row = await this.loadRow(id);
    this.authorize(principal, 'content.submit_review', row.status);
    if (row.status !== 'DRAFT' && row.status !== 'CORRECTION_REQUIRED') throw AppError.contentStateInvalid();
    const updated = await this.prisma.previousYearPaper.update({
      where: { id },
      data: { status: 'SUBMITTED' },
      include: { exam: { select: { nameHi: true, nameEn: true } } },
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'pyq_paper.submitted', targetType: 'PreviousYearPaper', targetId: id, result: 'SUCCESS' });
    return this.toView(updated);
  }

  /** SUBMITTED -> UNDER_REVIEW, same intermediate step Questions/Lessons use
   *  — the policy engine's STATUS_ALLOWS only lets content.approve act on
   *  UNDER_REVIEW, never SUBMITTED directly. */
  async startReview(principal: Principal, id: string): Promise<PyqPaperView> {
    const row = await this.loadRow(id);
    this.authorize(principal, 'content.review', row.status);
    if (row.status !== 'SUBMITTED') throw AppError.contentStateInvalid();
    const updated = await this.prisma.previousYearPaper.update({
      where: { id },
      data: { status: 'UNDER_REVIEW' },
      include: { exam: { select: { nameHi: true, nameEn: true } } },
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'pyq_paper.review_started', targetType: 'PreviousYearPaper', targetId: id, result: 'SUCCESS' });
    return this.toView(updated);
  }

  async approve(principal: Principal, id: string): Promise<PyqPaperView> {
    const row = await this.loadRow(id);
    this.authorize(principal, 'content.approve', row.status);
    if (row.status !== 'UNDER_REVIEW') throw AppError.contentStateInvalid();
    const updated = await this.prisma.previousYearPaper.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: principal.userId },
      include: { exam: { select: { nameHi: true, nameEn: true } } },
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'pyq_paper.approved', targetType: 'PreviousYearPaper', targetId: id, result: 'SUCCESS' });
    return this.toView(updated);
  }

  async publish(principal: Principal, id: string): Promise<PyqPaperView> {
    const row = await this.loadRow(id);
    this.authorize(principal, 'content.publish', row.status);
    if (row.status !== 'APPROVED') throw AppError.contentStateInvalid();
    const updated = await this.prisma.previousYearPaper.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
      include: { exam: { select: { nameHi: true, nameEn: true } } },
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'pyq_paper.published', targetType: 'PreviousYearPaper', targetId: id, result: 'SUCCESS' });
    return this.toView(updated);
  }

  // ── Student-facing ──
  /** Same org-scope-or-platform-wide filter as staff list() and
   *  student-tests.service.ts's orgScopeFilter — an institute-owned paper is
   *  only visible to that institute's own members; platform-wide (orgId:
   *  null) papers, expected to be the common case for real past exam
   *  papers, show to every student regardless of institute. */
  async listForStudent(principal: Principal): Promise<StudentPyqPaperListItem[]> {
    const rows = await this.prisma.previousYearPaper.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        OR: [{ orgId: principal.orgId ?? undefined }, { orgId: null }],
      },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
      take: 100,
      include: { exam: { select: { nameHi: true, nameEn: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      examNameHi: r.exam.nameHi,
      examNameEn: r.exam.nameEn,
      titleHi: r.titleHi,
      titleEn: r.titleEn,
      year: r.year,
    }));
  }

  /** Fresh short-lived presigned GET URL per request — same convention as
   *  the lesson PDF player (content-workflow.service.ts), never a
   *  permanently public URL. */
  async downloadForStudent(principal: Principal, id: string): Promise<PyqPaperDownload> {
    const row = await this.prisma.previousYearPaper.findFirst({
      where: {
        id,
        status: 'PUBLISHED',
        deletedAt: null,
        OR: [{ orgId: principal.orgId ?? undefined }, { orgId: null }],
      },
      include: { asset: { select: { storageKey: true } } },
    });
    if (!row || !row.asset.storageKey) throw AppError.notFound('Paper not found.');
    const expiresInSeconds = 300;
    const url = await this.s3.presignGet(row.asset.storageKey, expiresInSeconds);
    return { url, expiresInSeconds };
  }

  private async loadRow(id: string) {
    const row = await this.prisma.previousYearPaper.findUnique({ where: { id } });
    if (!row) throw AppError.notFound('Previous-year paper not found.');
    return row;
  }
}
