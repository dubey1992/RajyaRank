import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type {
  CoursePricingResolved,
  DashboardResponse,
  InstituteCourseSummary,
  JoinInstitution,
  JoinInstitutionResponse,
  Onboarding,
  PlaybackTokenResponse,
  ProgressUpdate,
  StudentCourseDetail,
  StudentCourseSummary,
  StudyGoals,
  UpdateGoals,
} from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { EntitlementService } from '../payments/entitlement.service';
import { AuditService } from '../audit/audit.service';
import { AuthorizationService } from '../authz/authorization.service';
import { NotificationService } from '../notifications/notification.service';
import { institutionJoinedEmail } from '../notifications/email-templates/engagement';
import { StudyPlanService } from './study-plan.service';
import { AppError } from '../common/errors/app-error';

/**
 * Student learning experience. Access to protected content is gated by
 * ENTITLEMENTS (Phase 6): free-preview published lessons are open; every other
 * published lesson requires a live entitlement for its course, else
 * ENTITLEMENT_REQUIRED. Media is only ever served via short-lived signed URLs.
 */
@Injectable()
export class StudentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly entitlements: EntitlementService,
    private readonly audit: AuditService,
    private readonly authz: AuthorizationService,
    private readonly notifications: NotificationService,
    private readonly studyPlan: StudyPlanService,
  ) {}

  private studentId(p: Principal): string {
    if (p.kind !== 'STUDENT') throw AppError.permissionDenied('Student account required.');
    return p.userId;
  }

  /** Deterministic weak-topic recommendations (§13.3) — now lives on
   *  StudyPlanService since the plan generator also needs it (to interleave
   *  weak-topic drills), and StudentService already depends on StudyPlanService. */
  weakTopics(p: Principal) {
    return this.studyPlan.weakTopics(p);
  }

  async onboarding(p: Principal, dto: Onboarding) {
    const userId = this.studentId(p);
    await this.prisma.$transaction([
      this.prisma.studentProfile.update({
        where: { userId },
        data: {
          stateId: dto.stateId,
          targetExamId: dto.targetExamId,
          qualification: dto.qualification,
          dailyStudyMinutes: dto.dailyStudyMinutes,
          targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
          preferredSubjects: dto.preferredSubjects,
          onboardedAt: new Date(),
        },
      }),
      ...(dto.locale ? [this.prisma.user.update({ where: { id: userId }, data: { locale: dto.locale } })] : []),
    ]);
    return { onboarded: true };
  }

  /** Lets a student bypass onboarding entirely and fill everything in later
   *  from Profile & Settings — sets only onboardedAt, none of the profile
   *  fields it would normally capture. Every downstream reader of those
   *  fields (dashboard recommendations, study plan, goals) already treats
   *  them as optional/nullable, since that's the exact same state a student
   *  is in before ever visiting the onboarding screen. */
  async skipOnboarding(p: Principal) {
    const userId = this.studentId(p);
    await this.prisma.studentProfile.update({ where: { userId }, data: { onboardedAt: new Date() } });
    return { onboarded: true };
  }

  /** The state/exam/qualification/daily-minutes/target-date goal, editable
   *  any time after onboarding (previously frozen forever once onboarding
   *  completed) — or, for a student who skipped onboarding, filled in here
   *  for the first time. */
  async getGoals(p: Principal): Promise<StudyGoals> {
    const userId = this.studentId(p);
    const profile = await this.prisma.studentProfile.findUnique({ where: { userId }, include: { targetExam: true } });
    return {
      stateId: profile?.stateId ?? null,
      targetExamId: profile?.targetExamId ?? null,
      targetExamNameHi: profile?.targetExam?.nameHi ?? null,
      targetExamNameEn: profile?.targetExam?.nameEn ?? null,
      qualification: profile?.qualification ?? null,
      dailyStudyMinutes: profile?.dailyStudyMinutes ?? null,
      targetDate: profile?.targetDate ? profile.targetDate.toISOString() : null,
    };
  }

  async updateGoals(p: Principal, dto: UpdateGoals): Promise<StudyGoals> {
    const userId = this.studentId(p);
    await this.prisma.studentProfile.update({
      where: { userId },
      data: {
        ...(dto.stateId !== undefined ? { stateId: dto.stateId } : {}),
        ...(dto.targetExamId !== undefined ? { targetExamId: dto.targetExamId } : {}),
        ...(dto.qualification !== undefined ? { qualification: dto.qualification } : {}),
        ...(dto.dailyStudyMinutes !== undefined ? { dailyStudyMinutes: dto.dailyStudyMinutes } : {}),
        ...(dto.targetDate !== undefined ? { targetDate: dto.targetDate ? new Date(dto.targetDate) : null } : {}),
      },
    });
    // A changed goal should be reflected immediately, not on the next nightly
    // sweep — same regeneration the manual "Regenerate plan" button triggers.
    await this.studyPlan.generate(userId);
    return this.getGoals(p);
  }

  /** Self-service institution join — distinct from the one-off checkout
   *  accessCode price unlock (payments.service.ts.createOrder), which never
   *  touches orgId. Entering the same code HERE is what actually makes the
   *  student a member: institute badge, institute-only course visibility,
   *  institute doubt routing, and no need to re-enter a code at checkout. */
  async joinInstitution(p: Principal, dto: JoinInstitution): Promise<JoinInstitutionResponse> {
    const userId = this.studentId(p);
    const code = dto.accessCode.trim();
    const org = await this.prisma.organization.findFirst({ where: { accessCode: code, status: 'ACTIVE' } });
    if (!org) throw AppError.notFound('Invalid institution code.');

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.orgId === org.id) return { orgId: org.id, orgName: org.name }; // idempotent re-submit

    if (user.orgId && user.orgId !== org.id) {
      throw AppError.conflict('You are already a member of another institution. Leave it first to join a new one.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { orgId: org.id } }),
      this.prisma.orgMembershipEvent.create({ data: { userId, orgId: org.id, action: 'JOINED', method: 'ACCESS_CODE' } }),
    ]);
    // The cached Principal (Redis, ~300s TTL) is keyed by permVersion, not
    // orgId — without this bump the student's OWN next request in the same
    // session could still see the stale orgId for up to 5 minutes.
    await this.authz.invalidate(userId);
    await this.audit.record({ actorUserId: userId, action: 'student.institution_join', targetType: 'Organization', targetId: org.id, result: 'SUCCESS' });
    await this.notifications.emit({
      userId,
      category: 'COURSE_ACCESS',
      titleHi: `आप अब ${org.name} के सदस्य हैं`,
      titleEn: `You're now a member of ${org.name}`,
      bodyHi: 'आपके संस्थान के कोर्स व मूल्य अब स्वतः लागू होंगे।',
      bodyEn: "Your institute's courses and pricing now apply automatically.",
      email: (locale) => institutionJoinedEmail(locale, org.name),
    });
    return { orgId: org.id, orgName: org.name };
  }

  async leaveInstitution(p: Principal): Promise<{ orgId: null }> {
    const userId = this.studentId(p);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.orgId) return { orgId: null }; // idempotent no-op

    const orgId = user.orgId;
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { orgId: null } }),
      this.prisma.orgMembershipEvent.create({ data: { userId, orgId, action: 'LEFT', method: 'ACCESS_CODE' } }),
    ]);
    await this.authz.invalidate(userId);
    await this.audit.record({ actorUserId: userId, action: 'student.institution_leave', targetType: 'Organization', targetId: orgId, result: 'SUCCESS' });
    return { orgId: null };
  }

  async dashboard(p: Principal): Promise<DashboardResponse> {
    const userId = this.studentId(p);
    const [user, profile] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.studentProfile.findUnique({ where: { userId }, include: { targetExam: true } }),
    ]);

    const targetExam = profile?.targetExam
      ? { id: profile.targetExam.id, nameHi: profile.targetExam.nameHi, nameEn: profile.targetExam.nameEn }
      : null;

    const examCountdownDays = profile?.targetDate
      ? Math.max(0, Math.ceil((profile.targetDate.getTime() - Date.now()) / 86_400_000))
      : null;

    const publishedInExam = profile?.targetExamId
      ? await this.prisma.lesson.findMany({
          where: {
            deletedAt: null,
            currentVersion: { status: 'PUBLISHED' },
            topic: { chapter: { subject: { course: { examId: profile.targetExamId } } } },
          },
          orderBy: { sequence: 'asc' },
          include: { currentVersion: true },
          take: 50,
        })
      : [];

    const progress = await this.prisma.lessonProgress.findMany({ where: { studentId: userId } });
    const completed = progress.filter((pr) => pr.status === 'COMPLETED').length;

    // "Today's plan" now reads from the persisted StudyPlan (generated lazily
    // on first read) instead of an ad-hoc "next 5 incomplete lessons" query —
    // one source of truth shared with the dedicated /study-plan page. Only
    // LESSON-kind items are shown here (this widget links straight to the
    // player); WEAK_TOPIC_DRILL items appear on the full /study-plan page.
    const todayView = await this.studyPlan.today(p);
    const todayLessonItems = todayView.items.filter((i) => i.lessonId);
    const todayLessonKinds = todayLessonItems.length
      ? await this.prisma.lesson.findMany({ where: { id: { in: todayLessonItems.map((i) => i.lessonId!) } }, select: { id: true, lessonType: true } })
      : [];
    const lessonTypeById = new Map(todayLessonKinds.map((l) => [l.id, l.lessonType]));
    const todayPlan = todayLessonItems.map((i) => ({
      lessonId: i.lessonId!,
      titleHi: i.titleHi,
      titleEn: i.titleEn,
      kind: lessonTypeById.get(i.lessonId!) ?? 'VIDEO',
      freePreview: i.freePreview,
    }));

    const continueWatching = progress
      .filter((pr) => pr.status === 'IN_PROGRESS')
      .sort((a, b) => b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime())
      .slice(0, 4);
    const continueLessons = await this.prisma.lessonVersion.findMany({
      where: { lesson: { id: { in: continueWatching.map((c) => c.lessonId) } }, status: { not: 'DRAFT' } },
      include: { lesson: true },
    });
    const continueOut = continueWatching.map((c) => {
      const lv = continueLessons.find((v) => v.lessonId === c.lessonId);
      return { lessonId: c.lessonId, titleHi: lv?.titleHi ?? '', titleEn: lv?.titleEn ?? '', percentComplete: c.percentComplete };
    });

    const activeEntitlements = await this.prisma.entitlement.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { endsAt: true },
    });
    const activeEntitlementEndsAt = activeEntitlements.length
      ? activeEntitlements.reduce<Date | null>((latest, e) => {
          if (!e.endsAt) return latest; // lifetime access among the active set — no expiry to show
          return !latest || e.endsAt > latest ? e.endsAt : latest;
        }, null)
      : null;

    const affairs = await this.prisma.currentAffair.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { dateFor: 'desc' },
      take: 3,
    });

    // Real study time = total watched video position across lessons (minutes).
    const studyTimeMinutes = Math.round(progress.reduce((sum, pr) => sum + pr.videoPositionSeconds, 0) / 60);

    // Average test score across submitted/auto-submitted/evaluated attempts.
    const attempts = await this.prisma.attempt.findMany({
      where: { studentId: userId, status: { in: ['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'] }, maxScore: { gt: 0 } },
      select: { score: true, maxScore: true },
    });
    const avgTestScorePercent = attempts.length
      ? Math.round((attempts.reduce((s, a) => s + ((a.score ?? 0) / a.maxScore) * 100, 0) / attempts.length) * 10) / 10
      : null;

    // Last-7-days activity flags (oldest first) + minutes done this week for the goal ring.
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = startOfDay(new Date());
    const dayKeys: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dayKeys.push(d.toISOString().slice(0, 10));
    }
    const activeDays = new Set(progress.map((pr) => startOfDay(pr.lastAccessedAt).toISOString().slice(0, 10)));
    const streakWeek = dayKeys.map((k) => activeDays.has(k));
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);
    const doneMinutes = Math.round(
      progress.filter((pr) => pr.lastAccessedAt >= weekStart).reduce((sum, pr) => sum + pr.videoPositionSeconds, 0) / 60,
    );
    const dailyGoal = profile?.dailyStudyMinutes ?? 120;

    return {
      greetingName: user.displayName,
      targetExam,
      examCountdownDays,
      examDate: profile?.targetDate ? profile.targetDate.toISOString() : null,
      studyStreakDays: streakDays(progress.map((pr) => pr.lastAccessedAt)),
      streakWeek,
      studyTimeMinutes,
      avgTestScorePercent,
      testsAttempted: attempts.length,
      weeklyGoal: { targetMinutes: dailyGoal * 7, doneMinutes },
      stats: {
        coursePercent: publishedInExam.length ? Math.round((completed / publishedInExam.length) * 100) : 0,
        lessonsCompleted: completed,
        lessonsTotal: publishedInExam.length,
      },
      todayPlan,
      continueWatching: continueOut,
      currentAffairs: affairs.map((a) => ({ id: a.id, titleHi: a.titleHi, titleEn: a.titleEn, dateFor: a.dateFor.toISOString() })),
      onboarded: Boolean(profile?.onboardedAt),
      activeEntitlementEndsAt: activeEntitlementEndsAt ? activeEntitlementEndsAt.toISOString() : null,
    };
  }

  /** Enrolled courses (active entitlement) with real completion progress. */
  async myCourses(p: Principal): Promise<StudentCourseSummary[]> {
    const userId = this.studentId(p);
    const ents = await this.prisma.entitlement.findMany({ where: { userId, status: 'ACTIVE', courseId: { not: null } } });
    const courseIds = [...new Set(ents.map((e) => e.courseId).filter((c): c is string => !!c))];
    if (!courseIds.length) return [];

    const courses = await this.prisma.course.findMany({ where: { id: { in: courseIds }, deletedAt: null }, orderBy: { sequence: 'asc' } });
    const lessons = await this.prisma.lesson.findMany({
      where: { deletedAt: null, currentVersion: { status: 'PUBLISHED' }, topic: { chapter: { subject: { courseId: { in: courseIds } } } } },
      select: { id: true, topic: { select: { chapter: { select: { subject: { select: { courseId: true } } } } } } },
    });
    const lessonCourse = new Map<string, string>();
    const totalByCourse = new Map<string, number>();
    for (const l of lessons) {
      const cid = l.topic.chapter.subject.courseId;
      lessonCourse.set(l.id, cid);
      totalByCourse.set(cid, (totalByCourse.get(cid) ?? 0) + 1);
    }
    const completedProgress = await this.prisma.lessonProgress.findMany({
      where: { studentId: userId, status: 'COMPLETED', lessonId: { in: [...lessonCourse.keys()] } },
      select: { lessonId: true },
    });
    const completedByCourse = new Map<string, number>();
    for (const pr of completedProgress) {
      const cid = lessonCourse.get(pr.lessonId);
      if (cid) completedByCourse.set(cid, (completedByCourse.get(cid) ?? 0) + 1);
    }
    const validByCourse = new Map<string, Date | null>();
    for (const e of ents) {
      if (!e.courseId) continue;
      const cur = validByCourse.get(e.courseId);
      if (e.endsAt && (!cur || e.endsAt > cur)) validByCourse.set(e.courseId, e.endsAt);
      else if (!validByCourse.has(e.courseId)) validByCourse.set(e.courseId, e.endsAt ?? null);
    }

    return courses.map((c) => {
      const total = totalByCourse.get(c.id) ?? 0;
      const completed = completedByCourse.get(c.id) ?? 0;
      return {
        courseId: c.id,
        code: c.code,
        titleHi: c.titleHi,
        titleEn: c.titleEn,
        lessonsTotal: total,
        lessonsCompleted: completed,
        percentComplete: total ? Math.round((completed / total) * 100) : 0,
        validUntil: (validByCourse.get(c.id) ?? null)?.toISOString() ?? null,
      };
    });
  }

  /** A logged-in student's resolved view of a course's price: the public price
   *  always, plus the institute price too when their orgId matches the
   *  course's owning institute (anonymous visitors never reach this — they
   *  only see the public price via the public /products endpoint). */
  async coursePricing(p: Principal, courseId: string): Promise<CoursePricingResolved> {
    this.studentId(p);
    const course = await this.prisma.course.findFirst({ where: { id: courseId, deletedAt: null } });
    if (!course) throw AppError.notFound('Course not found.');
    const products = await this.prisma.product.findMany({ where: { courseId, kind: 'COURSE', active: true } });
    const toView = (product: (typeof products)[number]) => ({
      id: product.id,
      priceMinor: product.priceMinor,
      originalPriceMinor: product.originalPriceMinor,
      currency: product.currency,
      validityDays: product.validityDays,
      accessType: product.accessType,
      active: product.active,
      audience: product.audience,
    });
    const publicProduct = products.find((x) => x.audience === 'PUBLIC');
    const instituteProduct = products.find((x) => x.audience === 'INSTITUTE');
    const qualifiesForInstitute = !!(course.orgId && p.orgId === course.orgId);
    return {
      public: publicProduct ? toView(publicProduct) : null,
      institute: qualifiesForInstitute && instituteProduct ? toView(instituteProduct) : null,
      qualifiesForInstitute,
    };
  }

  /** Courses owned by the student's own institute, regardless of public
   *  visibility — lets institute students discover/buy "institute only"
   *  courses that never appear in the public catalogue. */
  async instituteCourses(p: Principal): Promise<InstituteCourseSummary[]> {
    const userId = this.studentId(p);
    if (!p.orgId) return [];
    const courses = await this.prisma.course.findMany({
      where: { orgId: p.orgId, deletedAt: null, status: 'ACTIVE' },
      orderBy: { sequence: 'asc' },
    });
    if (!courses.length) return [];
    const entitlements = await this.prisma.entitlement.findMany({
      where: { userId, status: 'ACTIVE', courseId: { in: courses.map((c) => c.id) } },
      select: { courseId: true },
    });
    const entitledSet = new Set(entitlements.map((e) => e.courseId));
    return courses.map((c) => ({
      courseId: c.id,
      code: c.code,
      titleHi: c.titleHi,
      titleEn: c.titleEn,
      visibility: c.visibility,
      entitled: entitledSet.has(c.id),
    }));
  }

  /** Course curriculum (modules = subjects → published lessons) with the
   *  student's per-lesson progress and access flags. */
  async courseCurriculum(p: Principal, courseId: string): Promise<StudentCourseDetail> {
    const userId = this.studentId(p);
    const course = await this.prisma.course.findFirst({ where: { id: courseId, deletedAt: null } });
    if (!course) throw AppError.notFound('Course not found.');
    const accessAll = await this.entitlements.hasCourseAccess(userId, courseId);

    const subjects = await this.prisma.subject.findMany({
      where: { courseId, deletedAt: null },
      orderBy: { sequence: 'asc' },
      select: {
        id: true,
        nameHi: true,
        nameEn: true,
        chapters: {
          where: { deletedAt: null },
          orderBy: { sequence: 'asc' },
          select: {
            topics: {
              where: { deletedAt: null },
              orderBy: { sequence: 'asc' },
              select: {
                lessons: {
                  where: { deletedAt: null, currentVersion: { status: 'PUBLISHED' } },
                  orderBy: { sequence: 'asc' },
                  select: {
                    id: true,
                    lessonType: true,
                    freePreview: true,
                    currentVersion: { select: { titleHi: true, titleEn: true, estimatedMinutes: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const lessonIds = subjects.flatMap((s) => s.chapters.flatMap((c) => c.topics.flatMap((t) => t.lessons.map((l) => l.id))));
    const progress = await this.prisma.lessonProgress.findMany({ where: { studentId: userId, lessonId: { in: lessonIds } }, select: { lessonId: true, status: true } });
    const progMap = new Map(progress.map((pr) => [pr.lessonId, pr.status]));

    let total = 0;
    let completed = 0;
    const modules = subjects.map((s) => {
      const lessons = s.chapters.flatMap((c) =>
        c.topics.flatMap((t) =>
          t.lessons.map((l) => {
            total += 1;
            const status = (progMap.get(l.id) ?? 'NONE') as 'NONE' | 'IN_PROGRESS' | 'COMPLETED';
            if (status === 'COMPLETED') completed += 1;
            return {
              lessonId: l.id,
              titleHi: l.currentVersion?.titleHi ?? '',
              titleEn: l.currentVersion?.titleEn ?? '',
              lessonType: l.lessonType,
              freePreview: l.freePreview,
              estimatedMinutes: l.currentVersion?.estimatedMinutes ?? null,
              status,
              accessible: l.freePreview || accessAll,
            };
          }),
        ),
      );
      return { subjectId: s.id, nameHi: s.nameHi, nameEn: s.nameEn, lessons };
    });

    return {
      courseId: course.id,
      titleHi: course.titleHi,
      titleEn: course.titleEn,
      descHi: course.descHi,
      descEn: course.descEn,
      lessonsTotal: total,
      lessonsCompleted: completed,
      percentComplete: total ? Math.round((completed / total) * 100) : 0,
      validUntil: null,
      modules,
    };
  }

  async lessonDetail(p: Principal, lessonId: string) {
    const userId = this.studentId(p);
    const lesson = await this.loadPublishedLesson(lessonId);
    const progress = await this.prisma.lessonProgress.findUnique({
      where: { studentId_lessonId: { studentId: userId, lessonId } },
    });
    const bookmarked = await this.prisma.bookmark.findUnique({
      where: { studentId_lessonId: { studentId: userId, lessonId } },
    });
    const accessible = lesson.freePreview || (await this.hasAccess(userId, lessonId));
    return {
      lessonId,
      lessonType: lesson.lessonType,
      freePreview: lesson.freePreview,
      title: { hi: lesson.currentVersion?.titleHi, en: lesson.currentVersion?.titleEn },
      summary: { hi: lesson.currentVersion?.summaryHi, en: lesson.currentVersion?.summaryEn },
      accessible,
      progress: progress
        ? { status: progress.status, percentComplete: progress.percentComplete, videoPositionSeconds: progress.videoPositionSeconds }
        : null,
      bookmarked: Boolean(bookmarked),
    };
  }

  async playbackToken(p: Principal, lessonId: string): Promise<PlaybackTokenResponse> {
    const userId = this.studentId(p);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const lesson = await this.loadPublishedLesson(lessonId);
    if (!lesson.freePreview && !(await this.hasAccess(userId, lessonId))) {
      throw AppError.entitlementRequired();
    }

    const asset = await this.prisma.lessonAsset.findFirst({
      where: {
        lessonVersionId: lesson.currentVersionId ?? '',
        role: lesson.lessonType === 'PDF' ? 'PDF_NOTES' : 'PRIMARY_VIDEO',
      },
      include: { asset: true },
    });
    if (!asset || asset.asset.status !== 'READY' || (!asset.asset.storageKey && !asset.asset.embedUrl)) {
      throw AppError.assetNotReady('Lesson media is not available yet.');
    }
    const url = asset.asset.embedUrl ?? (await this.s3.presignGet(asset.asset.storageKey!, 300));
    return {
      url,
      expiresInSeconds: asset.asset.embedUrl ? 0 : 300,
      kind: asset.asset.embedUrl ? 'EMBED' : lesson.lessonType === 'PDF' ? 'DOCUMENT' : 'VIDEO',
      watermark: user.phone ? maskId(user.phone) : user.email ? maskId(user.email) : null,
    };
  }

  async updateProgress(p: Principal, lessonId: string, dto: ProgressUpdate) {
    const userId = this.studentId(p);
    await this.loadPublishedLesson(lessonId);
    const completed = dto.status === 'COMPLETED' || dto.percentComplete === 100;
    return this.prisma.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId: userId, lessonId } },
      update: {
        status: completed ? 'COMPLETED' : 'IN_PROGRESS',
        videoPositionSeconds: dto.videoPositionSeconds ?? undefined,
        percentComplete: dto.percentComplete ?? undefined,
        completedAt: completed ? new Date() : null,
        lastAccessedAt: new Date(),
      },
      create: {
        studentId: userId,
        lessonId,
        status: completed ? 'COMPLETED' : 'IN_PROGRESS',
        videoPositionSeconds: dto.videoPositionSeconds ?? 0,
        percentComplete: dto.percentComplete ?? 0,
        completedAt: completed ? new Date() : null,
      },
    });
  }

  async toggleBookmark(p: Principal, lessonId: string) {
    const userId = this.studentId(p);
    const existing = await this.prisma.bookmark.findUnique({
      where: { studentId_lessonId: { studentId: userId, lessonId } },
    });
    if (existing) {
      await this.prisma.bookmark.delete({ where: { id: existing.id } });
      return { bookmarked: false };
    }
    await this.prisma.bookmark.create({ data: { studentId: userId, lessonId } });
    return { bookmarked: true };
  }

  async revision(p: Principal) {
    const userId = this.studentId(p);
    const [bookmarks, inProgress] = await Promise.all([
      this.prisma.bookmark.findMany({
        where: { studentId: userId },
        include: { lesson: { include: { currentVersion: true } } },
        take: 50,
      }),
      this.prisma.lessonProgress.findMany({
        where: { studentId: userId, status: 'IN_PROGRESS' },
        include: { lesson: { include: { currentVersion: true } } },
        take: 50,
      }),
    ]);
    return {
      bookmarked: bookmarks.map((b) => ({ lessonId: b.lessonId, titleHi: b.lesson.currentVersion?.titleHi ?? '', titleEn: b.lesson.currentVersion?.titleEn ?? '' })),
      inProgress: inProgress.map((pr) => ({ lessonId: pr.lessonId, titleHi: pr.lesson.currentVersion?.titleHi ?? '', titleEn: pr.lesson.currentVersion?.titleEn ?? '', percentComplete: pr.percentComplete })),
    };
  }

  async currentAffairs() {
    const items = await this.prisma.currentAffair.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { dateFor: 'desc' },
      take: 30,
    });
    return items.map((a) => ({
      id: a.id,
      dateFor: a.dateFor.toISOString(),
      titleHi: a.titleHi,
      titleEn: a.titleEn,
      bodyHi: a.bodyHi,
      bodyEn: a.bodyEn,
      category: a.category,
      scope: a.scope,
    }));
  }

  private async loadPublishedLesson(lessonId: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, deletedAt: null },
      include: { currentVersion: true },
    });
    if (!lesson || !lesson.currentVersion || lesson.currentVersion.status !== 'PUBLISHED') {
      throw AppError.notFound('Lesson is not available.');
    }
    return lesson;
  }

  /** Live entitlement check for the lesson's course. */
  private async hasAccess(userId: string, lessonId: string): Promise<boolean> {
    const courseId = await this.courseIdForLesson(lessonId);
    if (!courseId) return false;
    return this.entitlements.hasCourseAccess(userId, courseId);
  }

  private async courseIdForLesson(lessonId: string): Promise<string | null> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { topic: { select: { chapter: { select: { subject: { select: { courseId: true } } } } } } },
    });
    return lesson?.topic.chapter.subject.courseId ?? null;
  }
}

/** Consecutive days (ending today or yesterday) with any learning activity. */
function streakDays(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const days = new Set(dates.map((d) => d.toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  // Allow the streak to count from today or yesterday.
  if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function maskId(value: string): string {
  return value.length > 4 ? `••••${value.slice(-4)}` : '••••';
}
