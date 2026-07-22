import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type { CreateExam, CreateExamBody, CreateState } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors/app-error';

/**
 * Reference-catalogue writes (states, exam bodies, exams), gated by
 * `course.manage` at the controller — held by both Content Admin (global
 * platform staff) and Academic Head (per-institution).
 *
 * States and exam bodies are shared/global (no orgId) — real, fixed
 * reference data (Indian states; commissions like "Bihar Public Service
 * Commission") that every institution reuses as-is. Exams are
 * institution-owned (`Exam.orgId`): an Academic Head builds their own
 * institution's exam list, so a brand-new institution starts empty and
 * doesn't see another institution's (or a platform-seeded) exam it never
 * created. Content Admin/Super Admin creating an exam (no orgId) makes a
 * platform-wide one, visible the same way to every institution.
 */
@Injectable()
export class CatalogueAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private requirePlatformStaff(principal: Principal) {
    if (principal.orgId) {
      throw AppError.permissionDenied('Only platform staff can add to the shared reference catalogue — contact RajyaRank support.');
    }
  }

  async listExams(principal: Principal) {
    return this.prisma.exam.findMany({
      where: principal.orgId ? { orgId: principal.orgId } : {},
      orderBy: { code: 'asc' },
    });
  }

  async createState(principal: Principal, dto: CreateState) {
    this.requirePlatformStaff(principal);
    const existing = await this.prisma.state.findFirst({ where: { code: dto.code } });
    if (existing) throw AppError.conflict('A state with this code already exists.');
    const state = await this.prisma.state.create({ data: { code: dto.code, nameEn: dto.nameEn, nameHi: dto.nameHi } });
    await this.audit.record({ actorUserId: principal.userId, action: 'catalogue.state_created', targetType: 'State', targetId: state.id, result: 'SUCCESS' });
    return state;
  }

  async createExamBody(principal: Principal, dto: CreateExamBody) {
    const existing = await this.prisma.examBody.findFirst({ where: { code: dto.code } });
    if (existing) throw AppError.conflict('An exam body with this code already exists.');
    const body = await this.prisma.examBody.create({ data: { code: dto.code, nameEn: dto.nameEn, nameHi: dto.nameHi } });
    await this.audit.record({ actorUserId: principal.userId, action: 'catalogue.exam_body_created', targetType: 'ExamBody', targetId: body.id, result: 'SUCCESS' });
    return body;
  }

  async createExam(principal: Principal, dto: CreateExam) {
    const orgId = principal.orgId ?? null;
    const existing = await this.prisma.exam.findFirst({ where: { code: dto.code, orgId } });
    if (existing) throw AppError.conflict('An exam with this code already exists.');
    const body = await this.prisma.examBody.findUnique({ where: { id: dto.examBodyId } });
    if (!body) throw AppError.notFound('Exam body not found.');
    if (dto.stateId) {
      const state = await this.prisma.state.findUnique({ where: { id: dto.stateId } });
      if (!state) throw AppError.notFound('State not found.');
    }
    const exam = await this.prisma.exam.create({
      data: { code: dto.code, nameEn: dto.nameEn, nameHi: dto.nameHi, examBodyId: dto.examBodyId, stateId: dto.stateId ?? null, orgId },
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'catalogue.exam_created', targetType: 'Exam', targetId: exam.id, result: 'SUCCESS', after: { orgId } });
    return exam;
  }
}
