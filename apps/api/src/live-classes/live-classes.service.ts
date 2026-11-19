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
import { toEmbeddableUrl } from '../assets/assets.service';
import { AppError } from '../common/errors/app-error';

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
  ) {}

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

  private toView(row: {
    id: string;
    courseId: string;
    course: { titleHi: string; titleEn: string };
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
    };
  }

  // ── Staff ────────────────────────────────────────────────────────────

  async create(principal: Principal, dto: CreateLiveClassInput): Promise<LiveClassView> {
    const scope = await this.courseScope(dto.courseId);
    this.assertScope(principal, scope);
    const created = await this.prisma.liveClass.create({
      data: {
        courseId: dto.courseId,
        orgId: scope.orgId ?? null,
        hostUserId: principal.userId,
        titleHi: dto.titleHi,
        titleEn: dto.titleEn,
        descriptionHi: dto.descriptionHi ?? null,
        descriptionEn: dto.descriptionEn ?? null,
        startsAt: new Date(dto.startsAt),
        durationMinutes: dto.durationMinutes,
        embedUrl: normalizeYoutubeInput(dto.youtubeUrlOrId),
        createdBy: principal.userId,
      },
      include: { course: { select: { titleHi: true, titleEn: true } }, _count: { select: { attendees: true } } },
    });
    await this.audit.record({
      actorUserId: principal.userId,
      action: 'liveClass.create',
      targetType: 'LiveClass',
      targetId: created.id,
      result: 'SUCCESS',
      after: { courseId: dto.courseId, startsAt: dto.startsAt },
    });
    return this.toView(created);
  }

  async list(principal: Principal, courseId: string): Promise<LiveClassView[]> {
    const scope = await this.courseScope(courseId);
    this.assertScope(principal, scope);
    const rows = await this.prisma.liveClass.findMany({
      where: { courseId, deletedAt: null },
      orderBy: { startsAt: 'desc' },
      include: { course: { select: { titleHi: true, titleEn: true } }, _count: { select: { attendees: true } } },
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
    this.assertScope(principal, await this.courseScope(lc.courseId));
    const updated = await this.prisma.liveClass.update({
      where: { id },
      data: {
        titleHi: dto.titleHi,
        titleEn: dto.titleEn,
        descriptionHi: dto.descriptionHi,
        descriptionEn: dto.descriptionEn,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        durationMinutes: dto.durationMinutes,
        embedUrl: dto.youtubeUrlOrId ? normalizeYoutubeInput(dto.youtubeUrlOrId) : undefined,
      },
      include: { course: { select: { titleHi: true, titleEn: true } }, _count: { select: { attendees: true } } },
    });
    await this.audit.record({ actorUserId: principal.userId, action: 'liveClass.update', targetType: 'LiveClass', targetId: id, result: 'SUCCESS' });
    return this.toView(updated);
  }

  async cancel(principal: Principal, id: string): Promise<{ id: string }> {
    const lc = await this.loadForStaff(id);
    this.assertScope(principal, await this.courseScope(lc.courseId));
    await this.prisma.liveClass.update({ where: { id }, data: { status: 'CANCELLED' } });
    await this.audit.record({ actorUserId: principal.userId, action: 'liveClass.cancel', targetType: 'LiveClass', targetId: id, result: 'SUCCESS' });
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
      include: { course: { select: { titleHi: true, titleEn: true } }, _count: { select: { attendees: true } } },
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
}
