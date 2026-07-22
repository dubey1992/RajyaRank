import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type { CreateTest, QuickCreateQuiz, QuickCreateQuizResponse } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../authz/authorization.service';
import { AuditService } from '../audit/audit.service';
import { QuestionBankService } from '../question-bank/question-bank.service';
import { validateAnswerShape } from '../question-bank/answer-shape';
import { AppError } from '../common/errors/app-error';

@Injectable()
export class TestBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
    private readonly audit: AuditService,
    private readonly questionBank: QuestionBankService,
  ) {}

  /** orgId must be included for org-owned tests — otherwise an Academic
   *  Head's ORG-scoped StaffAssignment can never match (assignmentCovers()
   *  checks every SCOPE_FIELDS dimension present on the resource; omitting
   *  orgId here silently made every org-scoped assignment fail to cover any
   *  test, blocking Heads from reviewing/approving even their own
   *  institution's content). */
  private async examScope(examId: string, orgId?: string | null) {
    const exam = await this.prisma.exam.findFirst({ where: { id: examId } });
    if (!exam) throw AppError.notFound('Exam not found.');
    return { stateId: exam.stateId ?? undefined, examId, orgId: orgId ?? undefined };
  }

  private authorize(principal: Principal, permission: string, scope: object, status?: string, assurance?: 'AAL2') {
    const d = this.authz.check(principal, permission, { type: 'test', status, scope }, assurance);
    if (!d.allow) {
      if (d.code === 'STATUS_FORBIDDEN') throw AppError.contentStateInvalid();
      throw AppError.permissionDenied(d.reason);
    }
  }

  /** For endpoints reachable by more than one distinct permission — e.g. list()
   *  is used both by test.create holders (Teacher/Content Admin/Head, building
   *  tests) and content.approve-only holders (a pure Academic Reviewer, who
   *  needs to see what's awaiting their review). @RequirePermission only takes
   *  one code, so this check lives here instead of the controller decorator. */
  private authorizeAny(principal: Principal, permissions: string[]) {
    const allowed = permissions.some((code) => this.authz.check(principal, code, undefined).allow);
    if (!allowed) throw AppError.permissionDenied();
  }

  async createTest(principal: Principal, dto: CreateTest) {
    const scope = await this.examScope(dto.examId, principal.orgId);
    this.authorize(principal, 'test.create', scope);
    const test = await this.prisma.$transaction(async (tx) => {
      const t = await tx.test.create({
        data: { examId: dto.examId, orgId: principal.orgId ?? null, courseId: dto.courseId ?? null, type: dto.type, titleHi: dto.titleHi, titleEn: dto.titleEn, createdBy: principal.userId },
      });
      const v = await tx.testVersion.create({
        data: {
          testId: t.id,
          versionNumber: 1,
          status: 'DRAFT',
          durationMinutes: dto.durationMinutes,
          negativeMarking: dto.negativeMarking,
          randomizeQuestions: dto.randomizeQuestions,
          randomizeOptions: dto.randomizeOptions,
          resultRelease: dto.resultRelease,
          attemptLimit: dto.attemptLimit ?? null,
          passingScore: dto.passingScore ?? null,
          createdBy: principal.userId,
        },
      });
      return tx.test.update({ where: { id: t.id }, data: { currentVersionId: v.id } });
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'test.create', targetType: 'Test', targetId: test.id, result: 'SUCCESS' });
    return { id: test.id, currentVersionId: test.currentVersionId };
  }

  /**
   * One-shot quiz creation for the content wizard's basic Quiz step: creates
   * Test + TestVersion + a single section + all questions in one transaction,
   * so a mid-flow network failure can never leave an orphaned empty Test or a
   * partially-attached question set (there is no delete-test endpoint to clean
   * that up, and 4+N sequential frontend calls would risk exactly that).
   */
  async quickCreate(principal: Principal, dto: QuickCreateQuiz): Promise<QuickCreateQuizResponse> {
    const scope = await this.examScope(dto.examId, principal.orgId);
    this.authorize(principal, 'test.create', scope);

    const approvedCount = await this.prisma.questionVersion.count({
      where: { id: { in: dto.questionVersionIds }, status: { in: ['APPROVED', 'PUBLISHED'] } },
    });
    if (approvedCount !== dto.questionVersionIds.length) {
      throw AppError.contentStateInvalid('One or more selected questions are not approved.');
    }

    // Bulk-uploaded rows: validate ALL up front (all-or-nothing) — quickCreate
    // is deliberately atomic (see its doc comment above), so a mid-list bad
    // row must never leave a test half-built with only some questions attached.
    if (dto.newQuestions.length) {
      const fieldErrors: { path: string; message: string }[] = [];
      for (const [i, row] of dto.newQuestions.entries()) {
        try {
          validateAnswerShape(row.type, row.options, row.correctAnswer);
          await this.questionBank.subjectScope(row.subjectId); // throws if subject doesn't exist
        } catch (e) {
          fieldErrors.push({ path: `newQuestions.${i}`, message: e instanceof AppError ? e.message : 'Invalid row' });
        }
      }
      if (fieldErrors.length) {
        throw new AppError('VALIDATION_FAILED', 400, 'Some bulk-uploaded questions are invalid — fix and re-upload.', fieldErrors);
      }
    }

    const test = await this.prisma.$transaction(async (tx) => {
      const t = await tx.test.create({
        data: {
          examId: dto.examId,
          orgId: principal.orgId ?? null,
          courseId: dto.courseId ?? null,
          type: dto.type,
          titleHi: dto.titleHi,
          titleEn: dto.titleEn,
          createdBy: principal.userId,
        },
      });
      const v = await tx.testVersion.create({
        data: {
          testId: t.id,
          versionNumber: 1,
          status: dto.submitForReview ? 'SUBMITTED' : 'DRAFT',
          durationMinutes: dto.durationMinutes,
          negativeMarking: dto.negativeMarking,
          randomizeQuestions: false,
          randomizeOptions: false,
          resultRelease: dto.resultRelease,
          attemptLimit: dto.attemptLimit ?? null,
          passingScore: dto.passingScore ?? null,
          createdBy: principal.userId,
        },
      });
      const section = await tx.testSection.create({
        data: { testVersionId: v.id, nameHi: 'खंड 1', nameEn: 'Section 1', sequence: 0 },
      });

      // Auto-approved bulk-uploaded questions, created fresh in this same
      // transaction — see the schema/contract doc comments for why they skip
      // individual question-level review.
      const newQuestionRows = [];
      for (const row of dto.newQuestions) {
        newQuestionRows.push(await this.questionBank.createInTx(tx, principal, row, 'APPROVED'));
      }

      const allQuestionVersionIds = [...dto.questionVersionIds, ...newQuestionRows.map((q) => q.currentVersionId!)];
      await tx.testQuestion.createMany({
        data: allQuestionVersionIds.map((questionVersionId, i) => ({
          testSectionId: section.id,
          questionVersionId,
          sequence: i,
        })),
      });
      return tx.test.update({ where: { id: t.id }, data: { currentVersionId: v.id } });
    });

    await this.audit.record({
      actorUserId: principal.userId,
      action: 'test.quick_created',
      targetType: 'Test',
      targetId: test.id,
      result: 'SUCCESS',
      after: { existingQuestionCount: dto.questionVersionIds.length, bulkUploadedCount: dto.newQuestions.length },
    });
    return {
      id: test.id,
      testVersionId: test.currentVersionId!,
      status: dto.submitForReview ? 'SUBMITTED' : 'DRAFT',
      imported: dto.newQuestions.length,
    };
  }

  async addSection(principal: Principal, testVersionId: string, dto: { nameHi: string; nameEn: string; sequence: number }) {
    const tv = await this.versionForEdit(principal, testVersionId);
    return this.prisma.testSection.create({ data: { testVersionId: tv.id, ...dto } });
  }

  async addQuestion(
    principal: Principal,
    sectionId: string,
    dto: { questionVersionId: string; sequence: number; marks?: number; negativeMarks?: number },
  ) {
    const section = await this.prisma.testSection.findUnique({ where: { id: sectionId }, include: { testVersion: true } });
    if (!section) throw AppError.notFound('Section not found.');
    await this.versionForEdit(principal, section.testVersionId);
    const qv = await this.prisma.questionVersion.findUnique({ where: { id: dto.questionVersionId } });
    if (!qv) throw AppError.notFound('Question version not found.');
    if (qv.status !== 'APPROVED' && qv.status !== 'PUBLISHED') {
      throw AppError.contentStateInvalid('Only approved questions can be added to a test.');
    }
    return this.prisma.testQuestion.upsert({
      where: { testSectionId_questionVersionId: { testSectionId: sectionId, questionVersionId: dto.questionVersionId } },
      update: { sequence: dto.sequence, marks: dto.marks ?? null, negativeMarks: dto.negativeMarks ?? null },
      create: { testSectionId: sectionId, questionVersionId: dto.questionVersionId, sequence: dto.sequence, marks: dto.marks ?? null, negativeMarks: dto.negativeMarks ?? null },
    });
  }

  async submit(principal: Principal, testVersionId: string) {
    const tv = await this.load(testVersionId);
    this.authorize(principal, 'test.create', await this.examScope(tv.test.examId, tv.test.orgId), tv.status);
    if (tv.status !== 'DRAFT' && tv.status !== 'CORRECTION_REQUIRED') throw AppError.contentStateInvalid();
    // Resubmitting after a rejection clears the old reason immediately — the
    // creator has (presumably) fixed it, so it shouldn't linger in the UI
    // until the next approval cycle re-clears it.
    return this.prisma.testVersion.update({ where: { id: testVersionId }, data: { status: 'SUBMITTED', rejectionReason: null } });
  }

  /** Single-approval, role-based (any Academic Head or any Academic Reviewer
   *  — not a specific assigned individual, consistent with how every other
   *  approval in this app works) — matches lesson/question content, which
   *  has never required dual sign-off. Either role's approval alone moves
   *  the test straight to APPROVED; still records which role(s) signed off
   *  (headApprovedBy/reviewerApprovedBy) for the audit trail and UI badges,
   *  but neither one is a precondition for the other. Content Admin cannot
   *  reach this method at all — it holds neither content.approve nor
   *  content.publish, only content.create + content.submit_review. */
  async approve(principal: Principal, testVersionId: string) {
    let tv = await this.load(testVersionId);
    if (tv.status !== 'SUBMITTED' && tv.status !== 'UNDER_REVIEW') throw AppError.contentStateInvalid();
    tv = await this.ensureUnderReview(principal, tv);
    this.authorize(principal, 'content.approve', await this.examScope(tv.test.examId, tv.test.orgId), tv.status);

    const isHead = principal.roleKeys.includes('ACADEMIC_HEAD');
    const isReviewer = principal.roleKeys.includes('ACADEMIC_REVIEWER');
    const now = new Date();
    const data: Record<string, unknown> = { rejectionReason: null, status: 'APPROVED', approvedBy: principal.userId };
    if (isHead) { data.headApprovedBy = principal.userId; data.headApprovedAt = now; }
    if (isReviewer) { data.reviewerApprovedBy = principal.userId; data.reviewerApprovedAt = now; }

    const updated = await this.prisma.testVersion.update({ where: { id: testVersionId }, data });
    await this.audit.record({
      actorUserId: principal.userId,
      action: isHead && isReviewer ? 'test.approved_head_and_reviewer' : isHead ? 'test.approved_by_head' : isReviewer ? 'test.approved_by_reviewer' : 'test.approved',
      targetType: 'TestVersion',
      targetId: testVersionId,
      result: 'SUCCESS',
      after: { status: 'APPROVED' },
    });
    return updated;
  }

  /** Symmetric to approve() — either Head or Reviewer can send a submitted
   *  Mock Test back for correction. Clears any prior approval slot: a
   *  rejected test needs a fresh look once resubmitted, the same way a
   *  rejected KYC packet needs a fresh review after being fixed. */
  async reject(principal: Principal, testVersionId: string, reason: string) {
    let tv = await this.load(testVersionId);
    if (tv.status !== 'SUBMITTED' && tv.status !== 'UNDER_REVIEW') throw AppError.contentStateInvalid();
    tv = await this.ensureUnderReview(principal, tv);
    this.authorize(principal, 'content.approve', await this.examScope(tv.test.examId, tv.test.orgId), tv.status);
    const isHead = principal.roleKeys.includes('ACADEMIC_HEAD');
    const isReviewer = principal.roleKeys.includes('ACADEMIC_REVIEWER');
    if (!isHead && !isReviewer) {
      throw AppError.permissionDenied('Mock tests require rejection from an Academic Head or an Academic Reviewer.');
    }
    const updated = await this.prisma.testVersion.update({
      where: { id: testVersionId },
      data: {
        status: 'CORRECTION_REQUIRED',
        rejectionReason: reason,
        headApprovedBy: null,
        headApprovedAt: null,
        reviewerApprovedBy: null,
        reviewerApprovedAt: null,
      },
    });
    await this.audit.record({
      actorUserId: principal.userId,
      action: 'test.rejected',
      targetType: 'TestVersion',
      targetId: testVersionId,
      result: 'SUCCESS',
      after: { reason },
    });
    return updated;
  }

  async publish(principal: Principal, testVersionId: string) {
    const tv = await this.load(testVersionId);
    this.authorize(principal, 'content.publish', await this.examScope(tv.test.examId, tv.test.orgId), tv.status, 'AAL2');
    if (tv.status !== 'APPROVED') throw AppError.contentStateInvalid('Only approved tests can be published.');
    const published = await this.prisma.$transaction(async (tx) => {
      await tx.testVersion.updateMany({ where: { testId: tv.testId, status: 'PUBLISHED', id: { not: testVersionId } }, data: { status: 'SUPERSEDED' } });
      const p = await tx.testVersion.update({ where: { id: testVersionId }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
      await tx.test.update({ where: { id: tv.testId }, data: { currentVersionId: testVersionId } });
      return p;
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'test.published', targetType: 'TestVersion', targetId: testVersionId, result: 'SUCCESS' });
    return published;
  }

  async list(principal: Principal) {
    this.authorizeAny(principal, ['test.create', 'content.approve']);
    const orgScoped = !principal.isSuperAdmin && !!principal.orgId;
    return this.prisma.test.findMany({
      // Institution-scoped actors see their own org's tests PLUS platform-wide
      // ones (orgId null, e.g. Content Admin's) — an exact orgId match alone
      // hid every platform test from an Academic Head.
      where: { deletedAt: null, ...(orgScoped ? { OR: [{ orgId: principal.orgId }, { orgId: null }] } : {}) },
      include: {
        currentVersion: {
          select: { id: true, status: true, durationMinutes: true, headApprovedBy: true, reviewerApprovedBy: true, rejectionReason: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /** Read-only: full question list (text/options/correct answer/marks) for a
   *  test version, so a reviewer (or the author, or content manager) can
   *  actually inspect what they're submitting/approving/publishing — not
   *  just its title and duration. Same visibility as list(). */
  async detail(principal: Principal, testVersionId: string) {
    this.authorizeAny(principal, ['test.create', 'content.approve']);
    const tv = await this.prisma.testVersion.findUnique({
      where: { id: testVersionId },
      include: {
        test: { select: { titleHi: true, titleEn: true, type: true } },
        sections: {
          orderBy: { sequence: 'asc' },
          include: {
            questions: {
              orderBy: { sequence: 'asc' },
              include: { questionVersion: true },
            },
          },
        },
      },
    });
    if (!tv) throw AppError.notFound('Test version not found.');

    return {
      testVersionId: tv.id,
      titleHi: tv.test.titleHi,
      titleEn: tv.test.titleEn,
      type: tv.test.type,
      status: tv.status,
      durationMinutes: tv.durationMinutes,
      sections: tv.sections.map((s) => ({
        nameHi: s.nameHi,
        nameEn: s.nameEn,
        questions: s.questions.map((q) => ({
          questionVersionId: q.questionVersionId,
          marks: q.marks ?? q.questionVersion.marks,
          negativeMarks: q.negativeMarks ?? q.questionVersion.negativeMarks,
          type: q.questionVersion.type,
          textHi: q.questionVersion.textHi,
          textEn: q.questionVersion.textEn,
          options: q.questionVersion.options,
          correctAnswer: q.questionVersion.correctAnswer,
          explanationHi: q.questionVersion.explanationHi,
          explanationEn: q.questionVersion.explanationEn,
        })),
      })),
    };
  }

  private async load(testVersionId: string) {
    const tv = await this.prisma.testVersion.findUnique({ where: { id: testVersionId }, include: { test: true } });
    if (!tv) throw AppError.notFound('Test version not found.');
    return tv;
  }

  /** content.approve is status-gated to UNDER_REVIEW only (shared policy rule
   *  with lesson/question content) — but nothing else ever moves a Test out
   *  of SUBMITTED (unlike LessonVersion, there's no separate start-review
   *  step for tests). So approve()/reject() perform that transition
   *  themselves here, authorized via content.review, which both Academic
   *  Head and Academic Reviewer hold. */
  private async ensureUnderReview(principal: Principal, tv: Awaited<ReturnType<TestBuilderService['load']>>) {
    if (tv.status !== 'SUBMITTED') return tv;
    this.authorize(principal, 'content.review', await this.examScope(tv.test.examId, tv.test.orgId), tv.status);
    const updated = await this.prisma.testVersion.update({ where: { id: tv.id }, data: { status: 'UNDER_REVIEW' } });
    return { ...tv, ...updated };
  }

  private async versionForEdit(principal: Principal, testVersionId: string) {
    const tv = await this.load(testVersionId);
    this.authorize(principal, 'test.create', await this.examScope(tv.test.examId, tv.test.orgId), tv.status);
    if (tv.status !== 'DRAFT' && tv.status !== 'CORRECTION_REQUIRED') {
      throw AppError.contentStateInvalid('Test can only be edited while in draft.');
    }
    return tv;
  }
}
