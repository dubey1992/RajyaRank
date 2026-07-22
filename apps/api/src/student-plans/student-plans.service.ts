import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type { StudentPlanView, UpsertStudentPlan } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors/app-error';

/** Student subscription plans — Super-Admin-only, 100% platform revenue.
 *  Deliberately NOT a new table: a plan is a `Product` row with
 *  `kind: 'SUBSCRIPTION'`, `courseId: null`, `audience: 'PUBLIC'`.
 *  `examId: null` = Pro/all-access; `examId` set = Plus, scoped to that exam.
 *  Purchasing one goes through the existing PaymentsService order/verify flow
 *  unchanged — see EntitlementService.hasCourseAccess for how the resulting
 *  Entitlement grants access at content-read time. */
@Injectable()
export class StudentPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async toView(p: {
    id: string;
    examId: string | null;
    titleHi: string;
    titleEn: string;
    priceMinor: number;
    originalPriceMinor: number | null;
    validityDays: number | null;
    active: boolean;
    createdAt: Date;
  }): Promise<StudentPlanView> {
    const exam = p.examId ? await this.prisma.exam.findUnique({ where: { id: p.examId }, select: { nameHi: true, nameEn: true } }) : null;
    return {
      id: p.id,
      examId: p.examId,
      examNameHi: exam?.nameHi ?? null,
      examNameEn: exam?.nameEn ?? null,
      titleHi: p.titleHi,
      titleEn: p.titleEn,
      priceMinor: p.priceMinor,
      originalPriceMinor: p.originalPriceMinor,
      validityDays: p.validityDays ?? 0,
      active: p.active,
      createdAt: p.createdAt.toISOString(),
    };
  }

  async list(): Promise<StudentPlanView[]> {
    const rows = await this.prisma.product.findMany({ where: { kind: 'SUBSCRIPTION' }, orderBy: { createdAt: 'asc' } });
    return Promise.all(rows.map((r) => this.toView(r)));
  }

  async create(actor: Principal, dto: UpsertStudentPlan): Promise<StudentPlanView> {
    if (dto.examId) {
      const exam = await this.prisma.exam.findUnique({ where: { id: dto.examId } });
      if (!exam) throw AppError.notFound('Exam not found.');
    }
    const row = await this.prisma.product.create({
      data: {
        kind: 'SUBSCRIPTION',
        accessType: 'SUBSCRIPTION',
        audience: 'PUBLIC',
        courseId: null,
        examId: dto.examId,
        titleHi: dto.titleHi,
        titleEn: dto.titleEn,
        priceMinor: dto.priceMinor,
        originalPriceMinor: dto.originalPriceMinor ?? null,
        validityDays: dto.validityDays,
        active: dto.active,
      },
    });
    await this.audit.record({ actorUserId: actor.userId, action: 'student_plan.created', targetType: 'Product', targetId: row.id, result: 'SUCCESS', after: dto });
    return this.toView(row);
  }

  async update(actor: Principal, id: string, dto: Partial<UpsertStudentPlan>): Promise<StudentPlanView> {
    const existing = await this.prisma.product.findFirst({ where: { id, kind: 'SUBSCRIPTION' } });
    if (!existing) throw AppError.notFound('Plan not found.');
    if (dto.examId) {
      const exam = await this.prisma.exam.findUnique({ where: { id: dto.examId } });
      if (!exam) throw AppError.notFound('Exam not found.');
    }
    const row = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.examId !== undefined ? { examId: dto.examId } : {}),
        ...(dto.titleHi !== undefined ? { titleHi: dto.titleHi } : {}),
        ...(dto.titleEn !== undefined ? { titleEn: dto.titleEn } : {}),
        ...(dto.priceMinor !== undefined ? { priceMinor: dto.priceMinor } : {}),
        ...(dto.originalPriceMinor !== undefined ? { originalPriceMinor: dto.originalPriceMinor } : {}),
        ...(dto.validityDays !== undefined ? { validityDays: dto.validityDays } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
    await this.audit.record({ actorUserId: actor.userId, action: 'student_plan.updated', targetType: 'Product', targetId: id, result: 'SUCCESS', after: dto });
    return this.toView(row);
  }
}
