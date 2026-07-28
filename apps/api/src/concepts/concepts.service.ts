import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type { ConceptView, UpsertConcept } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors/app-error';

/** Exam-syllabus-scoped concept graph — cross-cutting per-exam tags, not a
 *  node in any one course's Subject→Chapter→Topic tree, so this deliberately
 *  isn't part of the Course Studio curriculum-authoring flow. */
@Injectable()
export class ConceptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private toView(row: { _count: { lessons: number; questions: number } } & Omit<ConceptView, 'lessonCount' | 'questionCount'>): ConceptView {
    const { _count, ...c } = row;
    return { ...c, lessonCount: _count.lessons, questionCount: _count.questions };
  }

  async list(examId: string): Promise<ConceptView[]> {
    // A missing examId must not silently fall through to Prisma treating
    // `where: { examId: undefined }` as "no filter" — that would return the
    // entire concept graph across every exam instead of failing cleanly.
    if (!examId) throw AppError.notFound('examId is required.');
    const rows = await this.prisma.concept.findMany({
      where: { examId },
      orderBy: { sequence: 'asc' },
      include: { _count: { select: { lessons: true, questions: true } } },
    });
    return rows.map((r) => this.toView(r));
  }

  async create(principal: Principal, dto: UpsertConcept): Promise<ConceptView> {
    const exam = await this.prisma.exam.findUnique({ where: { id: dto.examId } });
    if (!exam) throw AppError.notFound('Exam not found.');
    if (dto.parentConceptId) {
      const parent = await this.prisma.concept.findUnique({ where: { id: dto.parentConceptId } });
      if (!parent || parent.examId !== dto.examId) throw AppError.notFound('Parent concept not found for this exam.');
    }
    const concept = await this.prisma.concept.create({
      data: { ...dto, parentConceptId: dto.parentConceptId ?? null },
      include: { _count: { select: { lessons: true, questions: true } } },
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'concept.created', targetType: 'Concept', targetId: concept.id, result: 'SUCCESS', after: { code: concept.code } });
    return this.toView(concept);
  }

  async update(principal: Principal, id: string, dto: Partial<UpsertConcept>): Promise<ConceptView> {
    const existing = await this.prisma.concept.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Concept not found.');
    if (dto.parentConceptId !== undefined && dto.parentConceptId !== null) {
      if (dto.parentConceptId === id) throw AppError.conflict('A concept cannot be its own parent.');
      const parent = await this.prisma.concept.findUnique({ where: { id: dto.parentConceptId } });
      const examId = dto.examId ?? existing.examId;
      if (!parent || parent.examId !== examId) throw AppError.notFound('Parent concept not found for this exam.');
    }
    const concept = await this.prisma.concept.update({
      where: { id },
      data: dto,
      include: { _count: { select: { lessons: true, questions: true } } },
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'concept.updated', targetType: 'Concept', targetId: id, result: 'SUCCESS', after: dto });
    return this.toView(concept);
  }

  async remove(principal: Principal, id: string): Promise<{ ok: true }> {
    const existing = await this.prisma.concept.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Concept not found.');
    const childCount = await this.prisma.concept.count({ where: { parentConceptId: id } });
    if (childCount > 0) throw AppError.conflict('Delete or reparent this concept’s child concepts first.');
    await this.prisma.concept.delete({ where: { id } });
    await this.audit.record({ actorUserId: principal.userId, action: 'concept.deleted', targetType: 'Concept', targetId: id, result: 'SUCCESS' });
    return { ok: true };
  }

  async attachLesson(principal: Principal, conceptId: string, lessonId: string): Promise<{ ok: true }> {
    const [concept, lesson] = await Promise.all([
      this.prisma.concept.findUnique({ where: { id: conceptId } }),
      this.prisma.lesson.findUnique({ where: { id: lessonId } }),
    ]);
    if (!concept) throw AppError.notFound('Concept not found.');
    if (!lesson) throw AppError.notFound('Lesson not found.');
    await this.prisma.lessonConcept.upsert({
      where: { lessonId_conceptId: { lessonId, conceptId } },
      create: { lessonId, conceptId },
      update: {},
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'concept.lesson_linked', targetType: 'Concept', targetId: conceptId, result: 'SUCCESS', after: { lessonId } });
    return { ok: true };
  }

  async detachLesson(principal: Principal, conceptId: string, lessonId: string): Promise<{ ok: true }> {
    await this.prisma.lessonConcept.deleteMany({ where: { conceptId, lessonId } });
    await this.audit.record({ actorUserId: principal.userId, action: 'concept.lesson_unlinked', targetType: 'Concept', targetId: conceptId, result: 'SUCCESS', after: { lessonId } });
    return { ok: true };
  }

  async attachQuestion(principal: Principal, conceptId: string, questionId: string): Promise<{ ok: true }> {
    const [concept, question] = await Promise.all([
      this.prisma.concept.findUnique({ where: { id: conceptId } }),
      this.prisma.question.findUnique({ where: { id: questionId } }),
    ]);
    if (!concept) throw AppError.notFound('Concept not found.');
    if (!question) throw AppError.notFound('Question not found.');
    await this.prisma.questionConcept.upsert({
      where: { questionId_conceptId: { questionId, conceptId } },
      create: { questionId, conceptId },
      update: {},
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'concept.question_linked', targetType: 'Concept', targetId: conceptId, result: 'SUCCESS', after: { questionId } });
    return { ok: true };
  }

  async detachQuestion(principal: Principal, conceptId: string, questionId: string): Promise<{ ok: true }> {
    await this.prisma.questionConcept.deleteMany({ where: { conceptId, questionId } });
    await this.audit.record({ actorUserId: principal.userId, action: 'concept.question_unlinked', targetType: 'Concept', targetId: conceptId, result: 'SUCCESS', after: { questionId } });
    return { ok: true };
  }
}
