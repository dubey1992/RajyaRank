import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type {
  CreateLiveClassInput,
  UpdateLiveClassInput,
  PublishLiveClassAsLessonInput,
  LiveClassView,
  LiveClassPhase,
  LiveClassAttendanceRow,
  JoinLiveClassResponse,
} from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../authz/authorization.service';
import { AuditService } from '../audit/audit.service';
import { EntitlementService } from '../payments/entitlement.service';
import { NotificationService } from '../notifications/notification.service';
import { toEmbeddableUrl } from '../assets/assets.service';
import { AppError } from '../common/errors/app-error';

/** Formats a date for the reschedule notification body — short, locale-aware,
 *  no timezone math beyond what Date/Intl already does for the server's own
 *  zone (same as every other bilingual date shown elsewhere in this app). */
function formatClassTime(date: Date, locale: 'hi' | 'en'): string {
  return date.toLocaleString(locale === 'hi' ? 'hi-IN' : 'en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** toEmbeddableUrl only parses full YouTube URLs — `new URL(raw)` throws for
 *  a bare string and it falls through unchanged (reproduced: passing just
 *  the 11-char video ID round-trips as-is, not as an embed URL). Staff often
 *  paste exactly that bare ID (it's what YouTube Studio's own "Video ID"
 *  field shows while setting up a Live broadcast), so this checks for that
 *  shape first and only defers to toEmbeddableUrl for anything else.
 *  YouTube video IDs are always 11 chars of [A-Za-z0-9_-]. */
const BARE_YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
function normalizeYoutubeInput(raw: string): string {
  const trimmed = raw.trim();
  if (BARE_YOUTUBE_ID.test(trimmed)) return `https://www.youtube.com/embed/${trimmed}`;
  return toEmbeddableUrl(trimmed);
}

interface Scope {
  orgId?: string;
  stateId?: string;
  examId?: string;
  courseId?: string;
}

/** Live Classes administration (staff) + listing/join (student). Mirrors
 *  CoursesService's scope-enforcement pattern exactly: the controller gates
 *  on the `course.manage` permission, this service additionally re-runs the
 *  policy engine against the specific course's real org/state/exam so a
 *  Content Admin/Academic Head can't act outside their assigned scope. */
@Injectable()
export class LiveClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
    private readonly audit: AuditService,
    private readonly entitlements: EntitlementService,
    private readonly notifications: NotificationService,
  ) {}

  /** Fans a notification out to every student entitled to this course — same
   *  bulk lookup + sequential emit() pattern as the T-15 reminder scheduler
   *  (live-class-reminder.scheduler.ts), reused via EntitlementService rather
   *  than duplicated. Used for reschedule/cancel alerts, which, unlike the
   *  reminder, aren't time-windowed so there's no Redis dedup needed here —
   *  each is a one-off reaction to a single staff action. */
  private async notifyEntitled(courseId: string, examId: string, titleHi: string, titleEn: string, bodyHi: string, bodyEn: string, liveClassId: string) {
    const userIds = await this.entitlements.entitledUserIdsForCourse(courseId, examId);
    for (const userId of userIds) {
      await this.notifications.emit({ userId, category: 'LIVE_CLASS', titleHi, titleEn, bodyHi, bodyEn, data: { liveClassId } });
    }
  }

  private assertScope(principal: Principal, scope: Scope) {
    const decision = this.authz.check(principal, 'course.manage', { type: 'course', scope });
    if (!decision.allow) throw AppError.permissionDenied('Resource is outside your assigned scope.');
  }

  private async courseScope(courseId: string): Promise<Scope & { orgId?: string }> {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, deletedAt: null } });
    if (!course) throw AppError.notFound('Course not found.');
    return { orgId: course.orgId ?? undefined, stateId: course.stateId, examId: course.examId, courseId: course.id };
  }

  private phaseOf(startsAt: Date, durationMinutes: number): LiveClassPhase {
    const now = Date.now();
    const endsAt = startsAt.getTime() + durationMinutes * 60_000;
    if (now >= endsAt) return 'ENDED';
    if (now >= startsAt.getTime()) return 'LIVE_NOW';
    return 'UPCOMING';
  }

  /** Include shape shared by every query that returns a LiveClassView — kept
   *  as one constant so create/list/update/cancel never drift from toView's
   *  expectations. */
  private static readonly VIEW_INCLUDE = {
    course: { select: { titleHi: true, titleEn: true } },
    host: { select: { displayName: true } },
    coHost: { select: { displayName: true } },
    batch: { select: { nameHi: true, nameEn: true } },
    _count: { select: { attendees: true } },
  } as const;

  private toView(row: {
    id: string;
    courseId: string;
    course: { titleHi: string; titleEn: string };
    host: { displayName: string | null };
    coHostUserId: string | null;
    coHost: { displayName: string | null } | null;
    batchId: string | null;
    batch: { nameHi: string; nameEn: string } | null;
    titleHi: string;
    titleEn: string;
    descriptionHi: string | null;
    descriptionEn: string | null;
    startsAt: Date;
    durationMinutes: number;
    embedUrl: string;
    status: 'SCHEDULED' | 'CANCELLED';
    publishedLessonId: string | null;
    _count: { attendees: number };
  }): LiveClassView {
    return {
      id: row.id,
      courseId: row.courseId,
      courseTitleHi: row.course.titleHi,
      courseTitleEn: row.course.titleEn,
      titleHi: row.titleHi,
      titleEn: row.titleEn,
      descriptionHi: row.descriptionHi,
      descriptionEn: row.descriptionEn,
      startsAt: row.startsAt.toISOString(),
      durationMinutes: row.durationMinutes,
      embedUrl: row.embedUrl,
      status: row.status,
      phase: this.phaseOf(row.startsAt, row.durationMinutes),
      publishedLessonId: row.publishedLessonId,
      attendeeCount: row._count.attendees,
      hostName: row.host.displayName ?? '—',
      batchId: row.batchId,
      batchNameHi: row.batch?.nameHi ?? null,
      batchNameEn: row.batch?.nameEn ?? null,
      coHostUserId: row.coHostUserId,
      coHostName: row.coHost?.displayName ?? null,
    };
  }

  // ── Staff ────────────────────────────────────────────────────────────

  /** A repeat.until further than this many occurrences out is rejected
   *  outright rather than silently truncated — a deliberate cap, not a
   *  real recurring-series abstraction (see CreateLiveClassInput's comment). */
  private static readonly MAX_REPEAT_OCCURRENCES = 60;

  async create(principal: Principal, dto: CreateLiveClassInput): Promise<LiveClassView> {
    const scope = await this.courseScope(dto.courseId);
    this.assertScope(principal, scope);

    const baseData = {
      courseId: dto.courseId,
      orgId: scope.orgId ?? null,
      hostUserId: principal.userId,
      coHostUserId: dto.coHostUserId ?? null,
      batchId: dto.batchId ?? null,
      titleHi: dto.titleHi,
      titleEn: dto.titleEn,
      descriptionHi: dto.descriptionHi ?? null,
      descriptionEn: dto.descriptionEn ?? null,
      durationMinutes: dto.durationMinutes,
      embedUrl: normalizeYoutubeInput(dto.youtubeUrlOrId),
      createdBy: principal.userId,
    };

    const firstStartsAt = new Date(dto.startsAt);
    const occurrenceStarts: Date[] = [firstStartsAt];
    if (dto.repeat) {
      const until = new Date(dto.repeat.until);
      const stepDays = dto.repeat.frequency === 'DAILY' ? 1 : 7;
      let next = new Date(firstStartsAt);
      for (;;) {
        next = new Date(next.getTime() + stepDays * 86_400_000);
        if (next.getTime() > until.getTime()) break;
        if (occurrenceStarts.length >= LiveClassesService.MAX_REPEAT_OCCURRENCES) {
          throw AppError.conflict(`A repeating series can create at most ${LiveClassesService.MAX_REPEAT_OCCURRENCES} classes — pick an earlier "until" date.`);
        }
        occurrenceStarts.push(next);
      }
    }

    // Each occurrence is created as its own fully independent LiveClass row
    // (no parent/series model) — editing or cancelling one never affects the
    // others. Sequential, not Promise.all, so audit records land in a stable
    // order and one failure doesn't leave a half-created batch racing itself.
    let first: LiveClassView | undefined;
    for (const startsAt of occurrenceStarts) {
      const row = await this.prisma.liveClass.create({
        data: { ...baseData, startsAt },
        include: LiveClassesService.VIEW_INCLUDE,
      });
      await this.audit.record({
        actorUserId: principal.userId,
        action: 'liveClass.create',
        targetType: 'LiveClass',
        targetId: row.id,
        result: 'SUCCESS',
        after: { courseId: dto.courseId, startsAt: startsAt.toISOString() },
      });
      first ??= this.toView(row);
    }
    // occurrenceStarts always has at least one entry (firstStartsAt), so the
    // loop above always runs at least once.
    return first!;
  }

  async list(principal: Principal, courseId: string): Promise<LiveClassView[]> {
    const scope = await this.courseScope(courseId);
    this.assertScope(principal, scope);
    const rows = await this.prisma.liveClass.findMany({
      where: { courseId, deletedAt: null },
      orderBy: { startsAt: 'desc' },
      include: LiveClassesService.VIEW_INCLUDE,
    });
    return rows.map((r) => this.toView(r));
  }

  private async loadForStaff(id: string) {
    const lc = await this.prisma.liveClass.findFirst({ where: { id, deletedAt: null } });
    if (!lc) throw AppError.notFound('Live class not found.');
    return lc;
  }

  async update(principal: Principal, id: string, dto: UpdateLiveClassInput): Promise<LiveClassView> {
    const lc = await this.loadForStaff(id);
    const scope = await this.courseScope(lc.courseId);
    this.assertScope(principal, scope);
    const newStartsAt = dto.startsAt ? new Date(dto.startsAt) : undefined;
    const rescheduled = newStartsAt && newStartsAt.getTime() !== lc.startsAt.getTime();
    const updated = await this.prisma.liveClass.update({
      where: { id },
      data: {
        titleHi: dto.titleHi,
        titleEn: dto.titleEn,
        descriptionHi: dto.descriptionHi,
        descriptionEn: dto.descriptionEn,
        startsAt: newStartsAt,
        durationMinutes: dto.durationMinutes,
        embedUrl: dto.youtubeUrlOrId ? normalizeYoutubeInput(dto.youtubeUrlOrId) : undefined,
        batchId: dto.batchId,
        coHostUserId: dto.coHostUserId,
      },
      include: LiveClassesService.VIEW_INCLUDE,
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'liveClass.update', targetType: 'LiveClass', targetId: id, result: 'SUCCESS' });

    if (rescheduled && scope.examId) {
      await this.notifyEntitled(
        lc.courseId,
        scope.examId,
        'आपकी लाइव क्लास का समय बदल गया है',
        'Your live class has been rescheduled',
        `${updated.titleHi} अब ${formatClassTime(updated.startsAt, 'hi')} पर होगी — ${updated.course.titleHi}`,
        `${updated.titleEn} is now at ${formatClassTime(updated.startsAt, 'en')} — ${updated.course.titleEn}`,
        id,
      );
    }
    return this.toView(updated);
  }

  async cancel(principal: Principal, id: string): Promise<{ id: string }> {
    const lc = await this.loadForStaff(id);
    const scope = await this.courseScope(lc.courseId);
    this.assertScope(principal, scope);
    const cancelled = await this.prisma.liveClass.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { course: { select: { titleHi: true, titleEn: true } } },
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'liveClass.cancel', targetType: 'LiveClass', targetId: id, result: 'SUCCESS' });

    if (scope.examId) {
      await this.notifyEntitled(
        lc.courseId,
        scope.examId,
        'आपकी लाइव क्लास रद्द कर दी गई है',
        'Your live class has been cancelled',
        `${cancelled.titleHi} — ${cancelled.course.titleHi}`,
        `${cancelled.titleEn} — ${cancelled.course.titleEn}`,
        id,
      );
    }
    return { id };
  }

  async attendance(principal: Principal, id: string): Promise<LiveClassAttendanceRow[]> {
    const lc = await this.loadForStaff(id);
    this.assertScope(principal, await this.courseScope(lc.courseId));
    const rows = await this.prisma.liveClassAttendance.findMany({
      where: { liveClassId: id },
      orderBy: { joinedAt: 'asc' },
      include: { student: { select: { displayName: true, studentProfile: { select: { fullName: true } } } } },
    });
    return rows.map((r) => ({
      studentId: r.studentId,
      name: r.student.studentProfile?.fullName ?? r.student.displayName ?? '—',
      joinedAt: r.joinedAt.toISOString(),
      lastSeenAt: r.lastSeenAt.toISOString(),
      durationMinutes: Math.round((r.lastSeenAt.getTime() - r.joinedAt.getTime()) / 60_000),
    }));
  }

  /** Only enabled once the class has actually ended — publishes the same
   *  (now-VOD) YouTube video as a regular lesson, reusing the exact
   *  embed-asset shape AssetsService.createEmbedAsset already creates for
   *  recorded-lesson YouTube embeds. No new video pipeline. */
  async publishAsLesson(principal: Principal, id: string, dto: PublishLiveClassAsLessonInput): Promise<{ lessonId: string }> {
    const lc = await this.loadForStaff(id);
    this.assertScope(principal, await this.courseScope(lc.courseId));
    if (lc.publishedLessonId) throw AppError.conflict('Already published as a lesson.');
    const endsAt = new Date(lc.startsAt.getTime() + lc.durationMinutes * 60_000);
    if (endsAt.getTime() > Date.now()) throw AppError.conflict('Cannot publish before the class has ended.');

    const topic = await this.prisma.topic.findFirst({
      where: { id: dto.topicId },
      include: { chapter: { include: { subject: true } } },
    });
    if (!topic || topic.chapter.subject.courseId !== lc.courseId) {
      throw AppError.notFound('Topic not found in this course.');
    }

    const asset = await this.prisma.mediaAsset.create({
      data: {
        ownerUserId: principal.userId,
        provider: 'embed',
        embedUrl: lc.embedUrl,
        assetType: 'VIDEO',
        status: 'READY',
        mimeType: 'text/uri-list',
      },
    });

    const lesson = await this.prisma.lesson.create({
      data: { topicId: dto.topicId, lessonType: 'VIDEO', createdBy: principal.userId },
    });
    const version = await this.prisma.lessonVersion.create({
      data: {
        lessonId: lesson.id,
        versionNumber: 1,
        status: 'PUBLISHED',
        titleHi: lc.titleHi,
        titleEn: lc.titleEn,
        summaryHi: lc.descriptionHi,
        summaryEn: lc.descriptionEn,
        createdBy: principal.userId,
        approvedBy: principal.userId,
        approvedAt: new Date(),
        publishedAt: new Date(),
        assets: { create: { assetId: asset.id, role: 'PRIMARY_VIDEO' } },
      },
    });
    await this.prisma.lesson.update({ where: { id: lesson.id }, data: { currentVersionId: version.id } });
    await this.prisma.liveClass.update({ where: { id }, data: { publishedLessonId: lesson.id } });

    await this.audit.record({
      actorUserId: principal.userId,
      action: 'liveClass.publish_as_lesson',
      targetType: 'LiveClass',
      targetId: id,
      result: 'SUCCESS',
      after: { lessonId: lesson.id },
    });
    return { lessonId: lesson.id };
  }

  // ── Student ──────────────────────────────────────────────────────────

  private studentId(p: Principal): string {
    if (p.kind !== 'STUDENT') throw AppError.permissionDenied('Student account required.');
    return p.userId;
  }

  /** Every non-cancelled class that hasn't ended yet, filtered down to the
   *  courses this student actually has access to. The live-class dataset is
   *  small by design (a handful per institution per day), so filtering by
   *  calling the existing per-course entitlement check for each distinct
   *  course here is simpler and plenty fast — no new bulk-entitlement query
   *  needed for v1. */
  async upcoming(principal: Principal): Promise<LiveClassView[]> {
    const studentId = this.studentId(principal);
    const now = new Date();
    const candidates = await this.prisma.liveClass.findMany({
      where: { status: 'SCHEDULED', deletedAt: null },
      orderBy: { startsAt: 'asc' },
      include: LiveClassesService.VIEW_INCLUDE,
    });
    const notEnded = candidates.filter((c) => c.startsAt.getTime() + c.durationMinutes * 60_000 > now.getTime());
    const courseIds = Array.from(new Set(notEnded.map((c) => c.courseId)));
    const accessByCourse = new Map<string, boolean>();
    await Promise.all(
      courseIds.map(async (courseId) => {
        accessByCourse.set(courseId, await this.entitlements.hasCourseAccess(studentId, courseId));
      }),
    );
    return notEnded.filter((c) => accessByCourse.get(c.courseId)).map((c) => this.toView(c));
  }

  /** Re-checks entitlement for this specific class (never trusts that it was
   *  only shown to entitled students by upcoming() above), enforces the join
   *  window (opens 10 min before start, closes at start+duration), and
   *  records attendance idempotently. */
  async join(principal: Principal, id: string): Promise<JoinLiveClassResponse> {
    const studentId = this.studentId(principal);
    const lc = await this.prisma.liveClass.findFirst({ where: { id, deletedAt: null } });
    if (!lc || lc.status === 'CANCELLED') throw AppError.notFound('Live class not found.');
    if (!(await this.entitlements.hasCourseAccess(studentId, lc.courseId))) throw AppError.entitlementRequired();

    const opensAt = lc.startsAt.getTime() - 10 * 60_000;
    const closesAt = lc.startsAt.getTime() + lc.durationMinutes * 60_000;
    const now = Date.now();
    if (now < opensAt) throw AppError.conflict('This class has not opened for joining yet.');
    if (now >= closesAt) throw AppError.conflict('This class has already ended.');

    await this.prisma.liveClassAttendance.upsert({
      where: { liveClassId_studentId: { liveClassId: id, studentId } },
      update: {},
      create: { liveClassId: id, studentId },
    });

    return { url: lc.embedUrl, kind: 'EMBED' };
  }

  /** Periodic heartbeat (called every ~20s by the join view, mirroring
   *  LessonProgress's heartbeat) — bumps lastSeenAt so attendance() can
   *  compute "duration so far". Re-checks entitlement same as join(), but
   *  does NOT re-enforce the join window: a heartbeat that arrives a few
   *  seconds after the class technically "closes" (clock skew, a slow
   *  network tick) shouldn't throw on a student who's already watching —
   *  only join() gates entry. Upserts rather than requiring a prior join()
   *  call to have happened, so a heartbeat can never fail with "not found"
   *  due to an ordering race between it and the join request. */
  async heartbeat(principal: Principal, id: string): Promise<{ ok: true }> {
    const studentId = this.studentId(principal);
    const lc = await this.prisma.liveClass.findFirst({ where: { id, deletedAt: null } });
    if (!lc || lc.status === 'CANCELLED') throw AppError.notFound('Live class not found.');
    if (!(await this.entitlements.hasCourseAccess(studentId, lc.courseId))) throw AppError.entitlementRequired();

    await this.prisma.liveClassAttendance.upsert({
      where: { liveClassId_studentId: { liveClassId: id, studentId } },
      update: { lastSeenAt: new Date() },
      create: { liveClassId: id, studentId },
    });
    return { ok: true };
  }
}
