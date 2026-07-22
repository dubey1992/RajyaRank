import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Principal } from '@rajyarank/auth';
import type { CreateQuestion, ImportResult } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../authz/authorization.service';
import { AuditService } from '../audit/audit.service';
import { sha256 } from '../common/crypto.util';
import { AppError } from '../common/errors/app-error';
import { validateAnswerShape } from './answer-shape';

@Injectable()
export class QuestionBankService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
    private readonly audit: AuditService,
  ) {}

  /** Public — also used by TestBuilderService to validate bulk-uploaded rows'
   *  subjectId before attaching them to a Mock Test. Accepts a raw subject ID
   *  OR its exact name (see resolveSubject()'s doc comment for why). */
  async subjectScope(subjectIdOrName: string) {
    const subject = await this.resolveSubject(this.prisma, subjectIdOrName);
    const course = await this.prisma.course.findUniqueOrThrow({ where: { id: subject.courseId } });
    return { stateId: course.stateId, examId: course.examId, courseId: course.id, subjectId: subject.id };
  }

  /** Bulk-CSV rows are hand-typed by staff, who naturally write a subject's
   *  name ("Polity") rather than hunt down its UUID — accepting a name here
   *  (falling back to it only when the value isn't a real subject ID) turns
   *  that into a working row instead of a confusing "Subject not found."
   *  Ambiguous names (same name reused across courses) are rejected with a
   *  clear message rather than silently picking one. */
  private async resolveSubject(client: Prisma.TransactionClient, subjectIdOrName: string) {
    const byId = await client.subject.findFirst({ where: { id: subjectIdOrName, deletedAt: null } });
    if (byId) return byId;
    const name = subjectIdOrName.trim();
    const matches = await client.subject.findMany({
      where: { deletedAt: null, OR: [{ nameEn: { equals: name, mode: 'insensitive' } }, { nameHi: { equals: name, mode: 'insensitive' } }] },
    });
    if (matches.length === 1) return matches[0]!;
    if (matches.length > 1) {
      throw AppError.conflict(`Multiple subjects are named "${subjectIdOrName}" — use the subject's ID instead of its name.`);
    }
    throw AppError.notFound(`Subject not found: "${subjectIdOrName}". Use the subject's ID, or its exact name.`);
  }

  /** Same accept-ID-or-name convenience as resolveSubject(), scoped to the
   *  already-resolved subject (via its chapter tree) so a common topic name
   *  reused across unrelated subjects doesn't cause a cross-subject match. */
  private async resolveTopic(client: Prisma.TransactionClient, topicIdOrName: string, subjectId: string) {
    const byId = await client.topic.findFirst({ where: { id: topicIdOrName, deletedAt: null } });
    if (byId) return byId;
    const name = topicIdOrName.trim();
    const matches = await client.topic.findMany({
      where: {
        deletedAt: null,
        chapter: { subjectId, deletedAt: null },
        OR: [{ nameEn: { equals: name, mode: 'insensitive' } }, { nameHi: { equals: name, mode: 'insensitive' } }],
      },
    });
    if (matches.length === 1) return matches[0]!;
    if (matches.length > 1) {
      throw AppError.conflict(`Multiple topics are named "${topicIdOrName}" in this subject — use the topic's ID instead of its name.`);
    }
    throw AppError.notFound(`Topic not found: "${topicIdOrName}" in this subject. Use the topic's ID, its exact name, or leave it blank.`);
  }

  private authorize(principal: Principal, permission: string, scope: object, status?: string) {
    const decision = this.authz.check(principal, permission, { type: 'question', status, scope });
    if (!decision.allow) throw AppError.permissionDenied(decision.reason);
  }

  private fingerprint(q: Pick<CreateQuestion, 'type' | 'textEn' | 'textHi'>): string {
    const norm = `${q.type}:${(q.textEn ?? q.textHi ?? '').toLowerCase().replace(/\s+/g, ' ').trim()}`;
    return sha256(norm);
  }

  async create(principal: Principal, dto: CreateQuestion) {
    const scope = await this.subjectScope(dto.subjectId);
    this.authorize(principal, 'question.create', scope);
    validateAnswerShape(dto.type, dto.options, dto.correctAnswer); // throws on invalid

    const question = await this.prisma.$transaction((tx) => this.createInTx(tx, principal, dto, 'DRAFT'));
    await this.audit.record({ actorUserId: principal.userId, action: 'question.create', targetType: 'Question', targetId: question.id, result: 'SUCCESS' });
    return { id: question.id, currentVersionId: question.currentVersionId };
  }

  /** Transaction-scoped write path shared by create() (own transaction,
   *  status DRAFT) and callers that need the insert inside their OWN
   *  transaction — e.g. TestBuilderService bulk-attaching questions to a
   *  Mock Test atomically, with status APPROVED (see quickCreate's doc
   *  comment for why: the Mock Test's own single-approval review, by an
   *  Academic Head or Reviewer, is the quality gate for bulk-uploaded rows,
   *  not a separate per-question review). */
  async createInTx(tx: Prisma.TransactionClient, principal: Principal, dto: CreateQuestion, status: 'DRAFT' | 'APPROVED') {
    // Re-resolve name-or-id here (not just in subjectScope()'s earlier
    // permission check) — this is the actual FK value going into the
    // Question row, so an unresolved name would otherwise violate the
    // subject/topic foreign key instead of failing with a clear error.
    const subject = await this.resolveSubject(tx, dto.subjectId);
    const topic = dto.topicId ? await this.resolveTopic(tx, dto.topicId, subject.id) : null;
    const q = await tx.question.create({
      data: {
        subjectId: subject.id,
        chapterId: dto.chapterId ?? null,
        topicId: topic?.id ?? null,
        examId: dto.examId ?? null,
        duplicateFingerprint: this.fingerprint(dto),
        createdBy: principal.userId,
      },
    });
    const v = await tx.questionVersion.create({
      data: {
        questionId: q.id,
        versionNumber: 1,
        status,
        type: dto.type,
        textHi: dto.textHi ?? null,
        textEn: dto.textEn ?? null,
        options: dto.options,
        correctAnswer: dto.correctAnswer as object,
        explanationHi: dto.explanationHi ?? null,
        explanationEn: dto.explanationEn ?? null,
        difficulty: dto.difficulty,
        marks: dto.marks,
        negativeMarks: dto.negativeMarks,
        sourceType: dto.sourceType ?? null,
        examYear: dto.examYear ?? null,
        createdBy: principal.userId,
        approvedBy: status === 'APPROVED' ? principal.userId : null,
      },
    });
    return tx.question.update({ where: { id: q.id }, data: { currentVersionId: v.id } });
  }

  async list(principal: Principal, subjectId?: string) {
    // Institution-scoped actors see questions whose subject's course belongs to
    // their org, PLUS platform-wide questions (course orgId null, e.g. Content
    // Admin's) — an exact orgId match alone hid every platform question.
    const orgScoped = !principal.isSuperAdmin && !!principal.orgId;
    return this.prisma.question.findMany({
      where: {
        deletedAt: null,
        ...(subjectId ? { subjectId } : {}),
        ...(orgScoped ? { subject: { course: { OR: [{ orgId: principal.orgId }, { orgId: null }] } } } : {}),
      },
      include: { currentVersion: { select: { id: true, type: true, textHi: true, textEn: true, status: true, difficulty: true, marks: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async submit(principal: Principal, versionId: string) {
    const v = await this.loadVersion(versionId);
    this.authorize(principal, 'question.create', await this.scopeOf(v.questionId), v.status);
    if (v.status !== 'DRAFT' && v.status !== 'CORRECTION_REQUIRED') throw AppError.contentStateInvalid();
    return this.prisma.questionVersion.update({ where: { id: versionId }, data: { status: 'SUBMITTED' } });
  }

  async approve(principal: Principal, versionId: string) {
    const v = await this.loadVersion(versionId);
    this.authorize(principal, 'content.approve', await this.scopeOf(v.questionId), v.status);
    if (v.status !== 'SUBMITTED' && v.status !== 'UNDER_REVIEW') throw AppError.contentStateInvalid();
    const updated = await this.prisma.questionVersion.update({
      where: { id: versionId },
      data: { status: 'APPROVED', approvedBy: principal.userId },
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'question.approved', targetType: 'QuestionVersion', targetId: versionId, result: 'SUCCESS' });
    return updated;
  }

  /** Bulk import with per-row validation; valid rows are inserted, invalid rows reported. */
  async import(principal: Principal, rows: CreateQuestion[]): Promise<ImportResult> {
    const errors: { row: number; message: string }[] = [];
    let imported = 0;
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]!;
      try {
        validateAnswerShape(row.type, row.options, row.correctAnswer);
        await this.create(principal, row);
        imported += 1;
      } catch (e) {
        errors.push({ row: i + 1, message: e instanceof AppError ? e.message : 'Invalid row' });
      }
    }
    await this.audit.record({ actorUserId: principal.userId, action: 'question.import', result: 'SUCCESS', after: { imported, failed: errors.length } });
    return { imported, errors };
  }

  private async loadVersion(versionId: string) {
    const v = await this.prisma.questionVersion.findUnique({ where: { id: versionId } });
    if (!v) throw AppError.notFound('Question version not found.');
    return v;
  }

  private async scopeOf(questionId: string) {
    const q = await this.prisma.question.findUniqueOrThrow({ where: { id: questionId } });
    return this.subjectScope(q.subjectId);
  }
}
