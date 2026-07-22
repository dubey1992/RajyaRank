import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type {
  CreateBatch,
  CreateCourse,
  CreateLesson,
  CourseReadinessGate,
  CourseReadinessView,
  CourseOutlineView,
  CoursePreviewResponse,
  UpdateCourse,
} from '@rajyarank/contracts';
import type { StudentCourseModule } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../authz/authorization.service';
import { AuditService } from '../audit/audit.service';
import { TokenService } from '../auth/token.service';
import { AppError } from '../common/errors/app-error';

interface Scope {
  orgId?: string;
  stateId?: string;
  examId?: string;
  courseId?: string;
  subjectId?: string;
}

/**
 * Course-hierarchy administration. The guard gates the `course.manage`
 * capability; here we additionally enforce ASSIGNMENT SCOPE by loading the
 * resource's real state/exam/course and re-running the central policy engine.
 */
@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
    private readonly audit: AuditService,
    private readonly tokens: TokenService,
  ) {}

  private assertScope(principal: Principal, scope: Scope) {
    const decision = this.authz.check(principal, 'course.manage', { type: 'course', scope });
    if (!decision.allow) throw AppError.permissionDenied('Resource is outside your assigned scope.');
  }

  private async courseScope(courseId: string): Promise<Scope & { courseId: string }> {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, deletedAt: null } });
    if (!course) throw AppError.notFound('Course not found.');
    return { orgId: course.orgId ?? undefined, stateId: course.stateId, examId: course.examId, courseId: course.id };
  }

  async createCourse(principal: Principal, dto: CreateCourse) {
    // Include the actor's institution so ORG-scoped Institution Heads may create
    // courses across any state/exam within their own org.
    this.assertScope(principal, { orgId: principal.orgId ?? undefined, stateId: dto.stateId, examId: dto.examId });
    const existing = await this.prisma.course.findUnique({ where: { code: dto.code } });
    if (existing) throw AppError.conflict('A course with this code already exists.');
    const course = await this.prisma.course.create({
      // Stamp the creating actor's institution (null for platform-level Super Admin / Content Admin).
      data: { ...dto, orgId: principal.orgId ?? null, createdBy: principal.userId, updatedBy: principal.userId },
    });
    await this.audit.record({
      actorUserId: principal.userId,
      action: 'course.create',
      targetType: 'Course',
      targetId: course.id,
      result: 'SUCCESS',
      after: { code: course.code },
    });
    return course;
  }

  async updateCourse(principal: Principal, id: string, dto: UpdateCourse) {
    const scope = await this.courseScope(id);
    this.assertScope(principal, scope);

    // Only re-check readiness on the ACTIVATING edge — i.e. this call actually
    // touches status/visibility AND the course wasn't already live — so
    // unrelated edits (e.g. a title tweak) to an already-live course never get
    // retroactively blocked by a gate added after real data existed.
    if (dto.status !== undefined || dto.visibility !== undefined) {
      const current = await this.prisma.course.findUniqueOrThrow({ where: { id } });
      const nextStatus = dto.status ?? current.status;
      const nextVisibility = dto.visibility ?? current.visibility;
      const wasAlreadyLive = current.status === 'ACTIVE' && current.visibility === 'PUBLIC';
      if (nextStatus === 'ACTIVE' && nextVisibility === 'PUBLIC' && !wasAlreadyLive) {
        const readiness = await this.readiness(principal, id);
        if (!readiness.hardGatesPassed) {
          const failed = readiness.gates.filter((g) => g.hard && !g.passed).map((g) => g.labelEn);
          throw AppError.conflict(`Cannot publish yet — missing: ${failed.join(', ')}.`);
        }
      }
    }

    const course = await this.prisma.course.update({
      where: { id },
      data: { ...dto, updatedBy: principal.userId },
    });
    await this.audit.record({
      actorUserId: principal.userId,
      action: 'course.update',
      targetType: 'Course',
      targetId: id,
      result: 'SUCCESS',
      after: dto,
    });
    return course;
  }

  async listCourses(actor: Principal) {
    return this.prisma.course.findMany({
      // Institution-scoped actors see their own org's courses PLUS
      // platform-wide ones (orgId null, e.g. Content Admin's) — an exact
      // orgId match alone hid every platform course from an Academic Head.
      where: { deletedAt: null, ...this.orgVisibility(actor) },
      orderBy: [{ sequence: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /** True when the actor is bound to a single institution (not a platform admin). */
  private orgScoped(actor: Principal): boolean {
    return !actor.isSuperAdmin && !!actor.orgId;
  }

  /** Prisma where-fragment: institution-scoped actors see their own org's rows
   *  plus platform-wide (orgId null) ones; platform actors see everything. */
  private orgVisibility(actor: Principal): { OR?: [{ orgId: string }, { orgId: null }] } {
    return this.orgScoped(actor) ? { OR: [{ orgId: actor.orgId! }, { orgId: null }] } : {};
  }

  async addBatch(principal: Principal, courseId: string, dto: CreateBatch) {
    this.assertScope(principal, await this.courseScope(courseId));
    return this.prisma.batch.create({
      data: {
        courseId,
        code: dto.code,
        nameHi: dto.nameHi,
        nameEn: dto.nameEn,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      },
    });
  }

  async addSubject(principal: Principal, courseId: string, dto: { nameHi: string; nameEn: string; sequence: number }) {
    this.assertScope(principal, await this.courseScope(courseId));
    return this.prisma.subject.create({ data: { courseId, ...dto } });
  }

  async addChapter(principal: Principal, subjectId: string, dto: { nameHi: string; nameEn: string; sequence: number }) {
    const subject = await this.prisma.subject.findFirst({ where: { id: subjectId, deletedAt: null } });
    if (!subject) throw AppError.notFound('Subject not found.');
    this.assertScope(principal, await this.courseScope(subject.courseId));
    return this.prisma.chapter.create({ data: { subjectId, ...dto } });
  }

  async addTopic(principal: Principal, chapterId: string, dto: { nameHi: string; nameEn: string; sequence: number }) {
    const chapter = await this.prisma.chapter.findFirst({
      where: { id: chapterId, deletedAt: null },
      include: { subject: true },
    });
    if (!chapter) throw AppError.notFound('Chapter not found.');
    this.assertScope(principal, await this.courseScope(chapter.subject.courseId));
    return this.prisma.topic.create({ data: { chapterId, ...dto } });
  }

  /** Reorder support for the curriculum builder — every add before this
   *  existed hardcoded `sequence: 0`, so a plain "swap two ranks" isn't
   *  reliable; the frontend re-numbers and PATCHes the whole sibling list
   *  on every move instead, which is correct regardless of prior values. */
  async updateSubject(principal: Principal, id: string, dto: { sequence: number }) {
    const subject = await this.prisma.subject.findFirst({ where: { id, deletedAt: null } });
    if (!subject) throw AppError.notFound('Subject not found.');
    this.assertScope(principal, await this.courseScope(subject.courseId));
    return this.prisma.subject.update({ where: { id }, data: { sequence: dto.sequence } });
  }

  async updateChapter(principal: Principal, id: string, dto: { sequence: number }) {
    const chapter = await this.prisma.chapter.findFirst({ where: { id, deletedAt: null }, include: { subject: true } });
    if (!chapter) throw AppError.notFound('Chapter not found.');
    this.assertScope(principal, await this.courseScope(chapter.subject.courseId));
    return this.prisma.chapter.update({ where: { id }, data: { sequence: dto.sequence } });
  }

  async updateTopic(principal: Principal, id: string, dto: { sequence: number }) {
    const topic = await this.prisma.topic.findFirst({
      where: { id, deletedAt: null },
      include: { chapter: { include: { subject: true } } },
    });
    if (!topic) throw AppError.notFound('Topic not found.');
    this.assertScope(principal, await this.courseScope(topic.chapter.subject.courseId));
    return this.prisma.topic.update({ where: { id }, data: { sequence: dto.sequence } });
  }

  /** Create a lesson + its first DRAFT LessonVersion (workflow transitions land in Phase 3). */
  async addLesson(principal: Principal, topicId: string, dto: CreateLesson) {
    const topic = await this.prisma.topic.findFirst({
      where: { id: topicId, deletedAt: null },
      include: { chapter: { include: { subject: true } } },
    });
    if (!topic) throw AppError.notFound('Topic not found.');
    this.assertScope(principal, await this.courseScope(topic.chapter.subject.courseId));

    const lesson = await this.prisma.$transaction(async (tx) => {
      const created = await tx.lesson.create({
        data: {
          topicId,
          batchId: dto.batchId ?? null,
          lessonType: dto.lessonType,
          freePreview: dto.freePreview,
          sequence: dto.sequence,
          createdBy: principal.userId,
        },
      });
      const version = await tx.lessonVersion.create({
        data: {
          lessonId: created.id,
          versionNumber: 1,
          status: 'DRAFT',
          titleHi: dto.titleHi,
          titleEn: dto.titleEn,
          summaryHi: dto.summaryHi ?? null,
          summaryEn: dto.summaryEn ?? null,
          estimatedMinutes: dto.estimatedMinutes ?? null,
          difficulty: dto.difficulty ?? undefined,
          language: dto.language ?? undefined,
          createdBy: principal.userId,
        },
      });
      return tx.lesson.update({ where: { id: created.id }, data: { currentVersionId: version.id } });
    });

    await this.audit.record({
      actorUserId: principal.userId,
      action: 'lesson.create',
      targetType: 'Lesson',
      targetId: lesson.id,
      result: 'SUCCESS',
    });
    return lesson;
  }

  /** Full hierarchy for the admin course editor (any status, unlike the public outline). */
  async courseDetail(actor: Principal, id: string) {
    return this.prisma.course.findFirst({
      where: { id, deletedAt: null, ...this.orgVisibility(actor) },
      include: {
        subjects: {
          where: { deletedAt: null },
          orderBy: { sequence: 'asc' },
          include: {
            chapters: {
              where: { deletedAt: null },
              orderBy: { sequence: 'asc' },
              include: {
                topics: {
                  where: { deletedAt: null },
                  orderBy: { sequence: 'asc' },
                  include: {
                    lessons: {
                      where: { deletedAt: null },
                      orderBy: { sequence: 'asc' },
                      select: {
                        id: true,
                        lessonType: true,
                        currentVersion: { select: { titleHi: true, titleEn: true, status: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /** Computed on read, never stored — reflects the CURRENT state of the
   *  curriculum/content/pricing, so it can never drift from reality. */
  async readiness(actor: Principal, id: string): Promise<CourseReadinessView> {
    const course = await this.prisma.course.findFirst({
      where: { id, deletedAt: null, ...this.orgVisibility(actor) },
      include: {
        subjects: {
          where: { deletedAt: null },
          include: {
            chapters: {
              where: { deletedAt: null },
              include: {
                topics: {
                  where: { deletedAt: null },
                  include: {
                    lessons: {
                      where: { deletedAt: null },
                      select: { freePreview: true, currentVersion: { select: { status: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!course) throw AppError.notFound('Course not found.');

    const publicPricing = await this.prisma.product.findFirst({
      where: { courseId: id, kind: 'COURSE', audience: 'PUBLIC', active: true },
    });

    const topics = course.subjects.flatMap((s) => s.chapters.flatMap((c) => c.topics));
    const lessons = topics.flatMap((t) => t.lessons);

    const hasCurriculum = topics.length > 0;
    const hasPublishedLesson = lessons.some((l) => l.currentVersion?.status === 'PUBLISHED');
    const hasPricing = !!publicPricing && (publicPricing.accessType === 'FREE' || publicPricing.priceMinor > 0);
    const hasMetadata = !!course.titleHi.trim() && !!course.titleEn.trim() && !!course.descHi?.trim() && !!course.descEn?.trim();
    const hasFreePreview = lessons.some((l) => l.freePreview && l.currentVersion?.status === 'PUBLISHED');
    const hasOutcomes = course.learningOutcomes.length > 0;

    const gates: CourseReadinessGate[] = [
      { key: 'curriculum', labelHi: 'पाठ्यक्रम पूर्ण', labelEn: 'Curriculum complete', passed: hasCurriculum, hard: true },
      { key: 'publishedLesson', labelHi: 'कम से कम एक प्रकाशित पाठ', labelEn: 'At least one published lesson', passed: hasPublishedLesson, hard: true },
      { key: 'pricing', labelHi: 'मूल्य निर्धारण सेट', labelEn: 'Pricing configured', passed: hasPricing, hard: true },
      { key: 'metadata', labelHi: 'शीर्षक व विवरण पूर्ण', labelEn: 'Title and description complete', passed: hasMetadata, hard: false },
      { key: 'freePreview', labelHi: 'नि:शुल्क पूर्वावलोकन उपलब्ध', labelEn: 'Free preview available', passed: hasFreePreview, hard: false },
      { key: 'learningOutcomes', labelHi: 'सीखने के परिणाम जोड़े गए', labelEn: 'Learning outcomes added', passed: hasOutcomes, hard: false },
    ];

    return {
      percent: Math.round((gates.filter((g) => g.passed).length / gates.length) * 100),
      hardGatesPassed: gates.filter((g) => g.hard).every((g) => g.passed),
      gates,
    };
  }

  /** Mints the short-lived token behind "Open student preview" (Course
   *  Studio Review step). Re-validates scope exactly like every other
   *  course-mutating action here — the token itself is the only thing that
   *  lets the (unauthenticated, on the public web app) preview view bypass
   *  the ACTIVE+PUBLIC gate a real visitor would hit. */
  async createPreviewToken(principal: Principal, id: string): Promise<{ token: string }> {
    const scope = await this.courseScope(id);
    this.assertScope(principal, scope);
    const token = this.tokens.signCoursePreview(id, principal.userId);
    await this.audit.record({
      actorUserId: principal.userId,
      action: 'course.preview_token_issued',
      targetType: 'Course',
      targetId: id,
      result: 'SUCCESS',
    });
    return { token };
  }

  /** Verifies a preview token and, if valid, returns both the marketing-hero
   *  outline (same shape the public course page renders) and a sample,
   *  never-real enrolled-curriculum view — works even for a DRAFT/unpublished
   *  course, since the token itself (minted by an authorized course.manage
   *  principal) is the authorization. Returns null on any invalid/expired/
   *  mismatched token so the caller can fall back to the normal public flow. */
  async previewData(courseId: string, token: string): Promise<CoursePreviewResponse | null> {
    try {
      const claims = this.tokens.verifyCoursePreview(token);
      if (claims.courseId !== courseId) return null;
    } catch {
      return null;
    }

    const course = await this.prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
      select: {
        id: true, code: true, titleHi: true, titleEn: true, descHi: true, descEn: true,
        stateId: true, examId: true, orgId: true,
        coursePromiseHi: true, coursePromiseEn: true, learningOutcomes: true,
        subjects: {
          where: { deletedAt: null },
          orderBy: { sequence: 'asc' },
          select: {
            id: true, nameHi: true, nameEn: true,
            chapters: {
              where: { deletedAt: null },
              orderBy: { sequence: 'asc' },
              select: {
                id: true, nameHi: true, nameEn: true,
                topics: {
                  where: { deletedAt: null },
                  orderBy: { sequence: 'asc' },
                  select: {
                    id: true, nameHi: true, nameEn: true,
                    lessons: {
                      where: { deletedAt: null, currentVersion: { status: 'PUBLISHED' } },
                      orderBy: { sequence: 'asc' },
                      select: {
                        id: true, lessonType: true, freePreview: true,
                        currentVersion: { select: { titleHi: true, titleEn: true, estimatedMinutes: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!course) return null;

    const outline: CourseOutlineView = {
      id: course.id,
      code: course.code,
      titleHi: course.titleHi,
      titleEn: course.titleEn,
      descHi: course.descHi,
      descEn: course.descEn,
      stateId: course.stateId,
      examId: course.examId,
      orgId: course.orgId,
      coursePromiseHi: course.coursePromiseHi,
      coursePromiseEn: course.coursePromiseEn,
      learningOutcomes: course.learningOutcomes,
      subjects: course.subjects.map((s) => ({
        id: s.id,
        nameHi: s.nameHi,
        nameEn: s.nameEn,
        chapters: s.chapters.map((c) => ({
          id: c.id,
          nameHi: c.nameHi,
          nameEn: c.nameEn,
          topics: c.topics.map((t) => ({
            id: t.id,
            nameHi: t.nameHi,
            nameEn: t.nameEn,
            lessons: t.lessons.map((l) => ({
              id: l.id,
              lessonType: l.lessonType,
              freePreview: l.freePreview,
              titleHi: l.currentVersion?.titleHi ?? '',
              titleEn: l.currentVersion?.titleEn ?? '',
              estimatedMinutes: l.currentVersion?.estimatedMinutes ?? null,
            })),
          })),
        })),
      })),
    };

    // Sample (never real) progress: the first ~18% of lessons, in curriculum
    // order, are shown as completed — purely illustrative, clearly labeled
    // as such by the web page, never derived from any real student's data.
    const orderedLessonIds = course.subjects.flatMap((s) => s.chapters.flatMap((c) => c.topics.flatMap((t) => t.lessons.map((l) => l.id))));
    const completedSet = new Set(orderedLessonIds.slice(0, Math.floor(orderedLessonIds.length * 0.18)));

    let total = 0;
    const modules: StudentCourseModule[] = course.subjects.map((s) => ({
      subjectId: s.id,
      nameHi: s.nameHi,
      nameEn: s.nameEn,
      lessons: s.chapters.flatMap((c) =>
        c.topics.flatMap((t) =>
          t.lessons.map((l) => {
            total += 1;
            return {
              lessonId: l.id,
              titleHi: l.currentVersion?.titleHi ?? '',
              titleEn: l.currentVersion?.titleEn ?? '',
              lessonType: l.lessonType,
              freePreview: l.freePreview,
              estimatedMinutes: l.currentVersion?.estimatedMinutes ?? null,
              status: (completedSet.has(l.id) ? 'COMPLETED' : 'NONE') as 'COMPLETED' | 'NONE',
              accessible: true,
            };
          }),
        ),
      ),
    }));

    return {
      outline,
      curriculum: {
        courseId: course.id,
        titleHi: course.titleHi,
        titleEn: course.titleEn,
        descHi: course.descHi,
        descEn: course.descEn,
        lessonsTotal: total,
        lessonsCompleted: completedSet.size,
        percentComplete: total ? Math.round((completedSet.size / total) * 100) : 0,
        validUntil: null,
        modules,
      },
    };
  }

  private async softDelete(principal: Principal, model: 'course' | 'subject' | 'chapter' | 'topic' | 'lesson', id: string) {
    // Endpoint is gated by course.manage; soft-delete keeps history + is reversible.
    const table = this.prisma[model] as { update: (a: unknown) => Promise<{ id: string }> };
    await table.update({ where: { id }, data: { deletedAt: new Date() } } as never);
    await this.audit.record({ actorUserId: principal.userId, action: `${model}.delete`, targetType: model, targetId: id, result: 'SUCCESS' });
    return { id };
  }

  deleteCourse(principal: Principal, id: string) { return this.softDelete(principal, 'course', id); }
  deleteSubject(principal: Principal, id: string) { return this.softDelete(principal, 'subject', id); }
  deleteChapter(principal: Principal, id: string) { return this.softDelete(principal, 'chapter', id); }
  deleteTopic(principal: Principal, id: string) { return this.softDelete(principal, 'topic', id); }
  deleteLesson(principal: Principal, id: string) { return this.softDelete(principal, 'lesson', id); }
}
