import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type { CurrentAffairView, UpsertCurrentAffair } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthorizationService } from '../authz/authorization.service';
import { AppError } from '../common/errors/app-error';

const EDITABLE_FROM = ['DRAFT', 'CORRECTION_REQUIRED'] as const;

/** Current Affairs maker/checker workflow — a right-sized subset of the
 *  shared ContentStatus enum lessons use (DRAFT → SUBMITTED →
 *  CORRECTION_REQUIRED → PUBLISHED → UNPUBLISHED/ARCHIVED), not the full
 *  version-based lesson state machine. See content-workflow.service.ts for
 *  the pattern this deliberately does not fully mirror (no versions, no
 *  course/topic hierarchy — CurrentAffair is a flat, single-row content
 *  type). Publish here does NOT require AAL2, unlike lesson publish — this
 *  is free public content with no payment/entitlement implications. */
@Injectable()
export class CurrentAffairsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly authz: AuthorizationService,
  ) {}

  private toView(row: {
    id: string;
    dateFor: Date;
    titleHi: string;
    titleEn: string;
    bodyHi: string;
    bodyEn: string;
    category: string;
    scope: string;
    source: string | null;
    status: string;
    publishedAt: Date | null;
    correctionReason: string | null;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): CurrentAffairView {
    return {
      id: row.id,
      dateFor: row.dateFor.toISOString(),
      titleHi: row.titleHi,
      titleEn: row.titleEn,
      bodyHi: row.bodyHi,
      bodyEn: row.bodyEn,
      category: row.category,
      scope: row.scope as CurrentAffairView['scope'],
      source: row.source,
      status: row.status,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      correctionReason: row.correctionReason,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** No single @RequirePermission code covers both makers (content.create)
   *  and checkers (content.review) — ACADEMIC_REVIEWER holds only the
   *  latter. Checked here directly, same pattern content-workflow.service.ts
   *  already uses for logic beyond what the route-level decorator expresses. */
  private assertCanView(principal: Principal) {
    const canMake = this.authz.check(principal, 'content.create').allow;
    const canCheck = this.authz.check(principal, 'content.review').allow;
    if (!canMake && !canCheck) throw AppError.permissionDenied();
  }

  async list(principal: Principal): Promise<CurrentAffairView[]> {
    this.assertCanView(principal);
    const rows = await this.prisma.currentAffair.findMany({ orderBy: [{ dateFor: 'desc' }, { createdAt: 'desc' }] });
    return rows.map((r) => this.toView(r));
  }

  async create(principal: Principal, dto: UpsertCurrentAffair): Promise<CurrentAffairView> {
    const row = await this.prisma.currentAffair.create({
      data: {
        dateFor: new Date(dto.dateFor),
        titleHi: dto.titleHi,
        titleEn: dto.titleEn,
        bodyHi: dto.bodyHi,
        bodyEn: dto.bodyEn,
        category: dto.category,
        scope: dto.scope,
        source: dto.source ?? null,
        status: 'DRAFT',
        createdBy: principal.userId,
      },
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'current_affair.created', targetType: 'CurrentAffair', targetId: row.id, result: 'SUCCESS' });
    return this.toView(row);
  }

  async update(principal: Principal, id: string, dto: Partial<UpsertCurrentAffair>): Promise<CurrentAffairView> {
    const existing = await this.prisma.currentAffair.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Current affair not found.');
    if (!EDITABLE_FROM.includes(existing.status as (typeof EDITABLE_FROM)[number])) {
      throw AppError.contentStateInvalid('Only draft or correction-required items can be edited.');
    }
    const row = await this.prisma.currentAffair.update({
      where: { id },
      data: {
        ...(dto.dateFor !== undefined ? { dateFor: new Date(dto.dateFor) } : {}),
        ...(dto.titleHi !== undefined ? { titleHi: dto.titleHi } : {}),
        ...(dto.titleEn !== undefined ? { titleEn: dto.titleEn } : {}),
        ...(dto.bodyHi !== undefined ? { bodyHi: dto.bodyHi } : {}),
        ...(dto.bodyEn !== undefined ? { bodyEn: dto.bodyEn } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.scope !== undefined ? { scope: dto.scope } : {}),
        ...(dto.source !== undefined ? { source: dto.source } : {}),
      },
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'current_affair.updated', targetType: 'CurrentAffair', targetId: id, result: 'SUCCESS', after: dto });
    return this.toView(row);
  }

  async submit(principal: Principal, id: string): Promise<CurrentAffairView> {
    const existing = await this.prisma.currentAffair.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Current affair not found.');
    if (!EDITABLE_FROM.includes(existing.status as (typeof EDITABLE_FROM)[number])) {
      throw AppError.contentStateInvalid('Only draft or correction-required items can be submitted.');
    }
    const row = await this.prisma.currentAffair.update({ where: { id }, data: { status: 'SUBMITTED', correctionReason: null } });
    await this.audit.record({ actorUserId: principal.userId, action: 'current_affair.submitted', targetType: 'CurrentAffair', targetId: id, result: 'SUCCESS' });
    return this.toView(row);
  }

  async requestCorrection(principal: Principal, id: string, body: string): Promise<CurrentAffairView> {
    const existing = await this.prisma.currentAffair.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Current affair not found.');
    if (existing.status !== 'SUBMITTED') throw AppError.contentStateInvalid('Only submitted items can be sent back for correction.');
    const row = await this.prisma.currentAffair.update({ where: { id }, data: { status: 'CORRECTION_REQUIRED', correctionReason: body } });
    await this.audit.record({ actorUserId: principal.userId, action: 'current_affair.correction_requested', targetType: 'CurrentAffair', targetId: id, result: 'SUCCESS', after: { reason: body } });
    return this.toView(row);
  }

  async publish(principal: Principal, id: string): Promise<CurrentAffairView> {
    const existing = await this.prisma.currentAffair.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Current affair not found.');
    if (existing.status !== 'SUBMITTED') throw AppError.contentStateInvalid('Only submitted items can be published.');
    const row = await this.prisma.currentAffair.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
    await this.audit.record({ actorUserId: principal.userId, action: 'current_affair.published', targetType: 'CurrentAffair', targetId: id, result: 'SUCCESS' });
    return this.toView(row);
  }

  async unpublish(principal: Principal, id: string, reason: string): Promise<CurrentAffairView> {
    const existing = await this.prisma.currentAffair.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Current affair not found.');
    if (existing.status !== 'PUBLISHED') throw AppError.contentStateInvalid('Only published items can be unpublished.');
    const row = await this.prisma.currentAffair.update({ where: { id }, data: { status: 'UNPUBLISHED' } });
    await this.audit.record({ actorUserId: principal.userId, action: 'current_affair.unpublished', targetType: 'CurrentAffair', targetId: id, result: 'SUCCESS', after: { reason } });
    return this.toView(row);
  }

  async archive(principal: Principal, id: string): Promise<CurrentAffairView> {
    const existing = await this.prisma.currentAffair.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Current affair not found.');
    if (!['DRAFT', 'CORRECTION_REQUIRED', 'UNPUBLISHED'].includes(existing.status)) {
      throw AppError.contentStateInvalid('Only draft, correction-required or unpublished items can be archived.');
    }
    const row = await this.prisma.currentAffair.update({ where: { id }, data: { status: 'ARCHIVED' } });
    await this.audit.record({ actorUserId: principal.userId, action: 'current_affair.archived', targetType: 'CurrentAffair', targetId: id, result: 'SUCCESS' });
    return this.toView(row);
  }
}
