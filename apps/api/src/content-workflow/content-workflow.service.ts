import { Injectable } from '@nestjs/common';
import type { ContentStatus, Prisma } from '@prisma/client';
import { scopeCovered, type Principal } from '@rajyarank/auth';
import type { AttachAsset, EditVersion } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../authz/authorization.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { S3Service } from '../s3/s3.service';
import { contentSubmittedEmail, correctionRequestedEmail, contentApprovedEmail, contentRejectedEmail, contentPublishedEmail } from '../notifications/email-templates/content';
import { newLessonEmail } from '../notifications/email-templates/engagement';
import { AppError } from '../common/errors/app-error';

type ReviewAction = Prisma.ReviewCommentCreateManyInput['action'];

interface VersionScope {
  stateId: string;
  examId: string;
  courseId: string;
  subjectId: string;
  ownerUserId: string;
  status: ContentStatus;
  freePreview: boolean;
}

/**
 * The content lifecycle state machine (PRD §8). Each transition:
 *   1. loads the version + its real course scope,
 *   2. authorizes via the central policy engine (capability + scope + status +
 *      assurance) — the STATUS_ALLOWS table encodes which permission may act in
 *      which status,
 *   3. guards the explicit source→target transition,
 *   4. mutates status + fields, records a ReviewComment on the timeline, and
 *      writes an audit event.
 * Maker/checker split: Content Admin creates and submits but never reviews,
 * approves, or publishes — that's Academic Head/Academic Reviewer's job.
 * Teachers/Question Setters never publish either; they only create/submit.
 */
@Injectable()
export class ContentWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
    private readonly s3: S3Service,
  ) {}

  /** Any actor who can legitimately reach this content on some list (author,
   *  content manager, or reviewer) — used to gate the read-only preview so
   *  reviewers can inspect what they're approving/publishing, not just its
   *  title, without opening up preview to unrelated staff. */
  private authorizeAnyPreview(principal: Principal) {
    const allowed = ['content.create', 'content.edit_own', 'content.edit_all', 'content.review', 'content.publish'].some(
      (code) => principal.permissionCodes.has(code),
    );
    if (!allowed) throw AppError.permissionDenied();
  }

  /** Reviewers/Content Admins whose assignment scope actually covers this
   *  content — reuses the same policy engine as reviewQueue()/board() rather
   *  than a separate ad-hoc scope check. Small candidate pool by design (this
   *  platform's staff counts are modest), so a per-candidate authz.check is
   *  cheap and always exactly right — no scope logic duplicated here. */
  private async scopeMatchedReviewers(scope: VersionScope): Promise<string[]> {
    const candidates = await this.prisma.user.findMany({
      where: {
        kind: 'STAFF',
        deletedAt: null,
        roles: { some: { role: { permissions: { some: { permission: { code: 'content.review' } } } } } },
      },
      select: { id: true },
    });
    const matched: string[] = [];
    for (const c of candidates) {
      const principal = await this.authz.resolvePrincipal(c.id, 'AAL1');
      if (!principal) continue;
      const decision = this.authz.check(principal, 'content.review', {
        type: 'content',
        status: 'SUBMITTED',
        scope: { stateId: scope.stateId, examId: scope.examId, courseId: scope.courseId, subjectId: scope.subjectId },
      });
      if (decision.allow) matched.push(c.id);
    }
    return matched;
  }

  private async loadScope(versionId: string): Promise<VersionScope> {
    const v = await this.prisma.lessonVersion.findUnique({
      where: { id: versionId },
      include: {
        lesson: { include: { topic: { include: { chapter: { include: { subject: true } } } } } },
      },
    });
    if (!v) throw AppError.notFound('Content version not found.');
    const subject = v.lesson.topic.chapter.subject;
    const course = await this.prisma.course.findUniqueOrThrow({ where: { id: subject.courseId } });
    return {
      stateId: course.stateId,
      examId: course.examId,
      courseId: course.id,
      subjectId: subject.id,
      ownerUserId: v.createdBy,
      status: v.status,
      freePreview: v.lesson.freePreview,
    };
  }

  private authorize(
    principal: Principal,
    permission: string,
    scope: VersionScope,
    assurance?: 'AAL2',
  ) {
    const decision = this.authz.check(
      principal,
      permission,
      {
        type: 'content',
        ownerUserId: scope.ownerUserId,
        status: scope.status,
        scope: { stateId: scope.stateId, examId: scope.examId, courseId: scope.courseId, subjectId: scope.subjectId },
      },
      assurance,
    );
    if (!decision.allow) {
      if (decision.code === 'STATUS_FORBIDDEN') throw AppError.contentStateInvalid();
      throw AppError.permissionDenied(decision.reason);
    }
  }

  /**
   * `content.edit_all` is a strictly broader capability than `content.edit_own`
   * and must cover an actor's own content too — otherwise a Content Admin who
   * authors their own draft (holds edit_all but not edit_own) gets locked out
   * of editing it. Only fall back to edit_own when the actor lacks edit_all.
   */
  private editPermission(principal: Principal, scope: VersionScope): string {
    if (principal.permissionCodes.has('content.edit_all')) return 'content.edit_all';
    return scope.ownerUserId === principal.userId ? 'content.edit_own' : 'content.edit_all';
  }

  private assertFrom(current: ContentStatus, allowed: ContentStatus[]) {
    if (!allowed.includes(current)) {
      throw AppError.contentStateInvalid(
        `Cannot perform this action from status ${current}.`,
      );
    }
  }

  private async transition(
    versionId: string,
    data: Prisma.LessonVersionUpdateInput,
    comment: { author: string; action: ReviewAction; body?: string },
    auditAction: string,
    principal: Principal,
    scope: VersionScope,
  ) {
    const [updated] = await this.prisma.$transaction([
      this.prisma.lessonVersion.update({ where: { id: versionId }, data }),
      this.prisma.reviewComment.create({
        data: { lessonVersionId: versionId, authorUserId: comment.author, action: comment.action, body: comment.body ?? null },
      }),
    ]);
    await this.audit.record({
      actorUserId: principal.userId,
      actorRole: principal.roleKeys.join(','),
      action: auditAction,
      targetType: 'LessonVersion',
      targetId: versionId,
      result: 'SUCCESS',
      before: { status: scope.status },
      after: { status: updated.status },
    });
    return updated;
  }

  // ── Teacher / owner ────────────────────────────────────────────────────────
  async editVersion(principal: Principal, versionId: string, dto: EditVersion) {
    const scope = await this.loadScope(versionId);
    const perm = this.editPermission(principal, scope);
    this.authorize(principal, perm, scope);
    const current = await this.prisma.lessonVersion.findUniqueOrThrow({ where: { id: versionId } });
    if (current.rowVersion !== dto.rowVersion) throw AppError.versionConflict();
    return this.prisma.lessonVersion.update({
      where: { id: versionId },
      data: {
        titleHi: dto.titleHi ?? undefined,
        titleEn: dto.titleEn ?? undefined,
        summaryHi: dto.summaryHi ?? undefined,
        summaryEn: dto.summaryEn ?? undefined,
        estimatedMinutes: dto.estimatedMinutes ?? undefined,
        changeSummary: dto.changeSummary ?? undefined,
        rowVersion: { increment: 1 },
      },
    });
  }

  async attachAsset(principal: Principal, versionId: string, dto: AttachAsset) {
    const scope = await this.loadScope(versionId);
    const perm = this.editPermission(principal, scope);
    this.authorize(principal, perm, scope);
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: dto.assetId } });
    if (!asset) throw AppError.notFound('Asset not found.');
    if (asset.status !== 'READY') throw AppError.assetNotReady();
    if (asset.embedUrl && !scope.freePreview) {
      throw AppError.conflict('Embed URLs are only allowed for free-preview lessons. Paid lessons must use an uploaded file.');
    }
    return this.prisma.lessonAsset.upsert({
      where: { lessonVersionId_assetId_role: { lessonVersionId: versionId, assetId: dto.assetId, role: dto.role } },
      update: { sequence: dto.sequence },
      create: { lessonVersionId: versionId, assetId: dto.assetId, role: dto.role, sequence: dto.sequence },
    });
  }

  async submit(principal: Principal, versionId: string) {
    const scope = await this.loadScope(versionId);
    this.authorize(principal, 'content.submit_review', scope);
    this.assertFrom(scope.status, ['DRAFT', 'CORRECTION_REQUIRED']);
    const resubmit = scope.status === 'CORRECTION_REQUIRED';
    const updated = await this.transition(
      versionId,
      { status: 'SUBMITTED', submittedAt: new Date() },
      { author: principal.userId, action: resubmit ? 'RESUBMITTED' : 'SUBMITTED' },
      'content.submitted',
      principal,
      scope,
    );
    const reviewerIds = await this.scopeMatchedReviewers(scope);
    await Promise.all(
      reviewerIds.map((userId) =>
        this.notifications.emit({
          userId,
          category: 'CONTENT_WORKFLOW',
          titleHi: 'समीक्षा हेतु नया कंटेंट',
          titleEn: 'New content submitted for review',
          bodyHi: `${updated.titleHi} समीक्षा के लिए प्रस्तुत किया गया है।`,
          bodyEn: `${updated.titleEn} has been submitted for review.`,
          data: { versionId },
          email: (locale) => contentSubmittedEmail(locale, updated.titleHi, updated.titleEn),
        }),
      ),
    );
    return updated;
  }

  // ── Reviewer ─────────────────────────────────────────────────────────────
  async startReview(principal: Principal, versionId: string) {
    const scope = await this.loadScope(versionId);
    this.authorize(principal, 'content.review', scope);
    this.assertFrom(scope.status, ['SUBMITTED']);
    return this.transition(
      versionId,
      { status: 'UNDER_REVIEW', reviewerId: principal.userId },
      { author: principal.userId, action: 'REVIEW_STARTED' },
      'content.review_started',
      principal,
      scope,
    );
  }

  async comment(principal: Principal, versionId: string, body: string) {
    const scope = await this.loadScope(versionId);
    this.authorize(principal, 'content.review', scope);
    return this.prisma.reviewComment.create({
      data: { lessonVersionId: versionId, authorUserId: principal.userId, action: 'COMMENT', body },
    });
  }

  async requestCorrection(principal: Principal, versionId: string, body: string) {
    const scope = await this.loadScope(versionId);
    this.authorize(principal, 'content.review', scope);
    this.assertFrom(scope.status, ['UNDER_REVIEW']);
    const updated = await this.transition(
      versionId,
      { status: 'CORRECTION_REQUIRED' },
      { author: principal.userId, action: 'CORRECTION_REQUESTED', body },
      'content.correction_requested',
      principal,
      scope,
    );
    await this.notifications.emit({
      userId: scope.ownerUserId,
      category: 'CONTENT_WORKFLOW',
      titleHi: 'सुधार का अनुरोध किया गया',
      titleEn: 'A correction was requested',
      bodyHi: `${updated.titleHi} पर सुधार का अनुरोध किया गया है।`,
      bodyEn: `A correction was requested on ${updated.titleEn}.`,
      data: { versionId },
      email: (locale) => correctionRequestedEmail(locale, updated.titleHi, updated.titleEn, body),
    });
    return updated;
  }

  async approve(principal: Principal, versionId: string) {
    const scope = await this.loadScope(versionId);
    this.authorize(principal, 'content.approve', scope);
    this.assertFrom(scope.status, ['UNDER_REVIEW']);
    const updated = await this.transition(
      versionId,
      { status: 'APPROVED', approvedBy: principal.userId, approvedAt: new Date() },
      { author: principal.userId, action: 'APPROVED' },
      'content.approved',
      principal,
      scope,
    );
    await this.notifications.emit({
      userId: scope.ownerUserId,
      category: 'CONTENT_WORKFLOW',
      titleHi: 'कंटेंट अनुमोदित',
      titleEn: 'Content approved',
      bodyHi: `${updated.titleHi} अनुमोदित कर दिया गया है।`,
      bodyEn: `${updated.titleEn} has been approved.`,
      data: { versionId },
      email: (locale) => contentApprovedEmail(locale, updated.titleHi, updated.titleEn),
    });
    return updated;
  }

  async reject(principal: Principal, versionId: string, reason: string) {
    const scope = await this.loadScope(versionId);
    this.authorize(principal, 'content.approve', scope);
    this.assertFrom(scope.status, ['UNDER_REVIEW']);
    const updated = await this.transition(
      versionId,
      { status: 'REJECTED', rejectionReason: reason },
      { author: principal.userId, action: 'REJECTED', body: reason },
      'content.rejected',
      principal,
      scope,
    );
    await this.notifications.emit({
      userId: scope.ownerUserId,
      category: 'CONTENT_WORKFLOW',
      titleHi: 'कंटेंट अस्वीकृत',
      titleEn: 'Content rejected',
      bodyHi: `${updated.titleHi} अस्वीकृत कर दिया गया है।`,
      bodyEn: `${updated.titleEn} has been rejected.`,
      data: { versionId },
      email: (locale) => contentRejectedEmail(locale, updated.titleHi, updated.titleEn, reason),
    });
    return updated;
  }

  // ── Academic Head / Academic Reviewer (publishing; requires AAL2) ───────
  async schedule(principal: Principal, versionId: string, publishAt: string) {
    const scope = await this.loadScope(versionId);
    this.authorize(principal, 'content.publish', scope, 'AAL2');
    this.assertFrom(scope.status, ['APPROVED', 'READY_TO_PUBLISH']);
    return this.transition(
      versionId,
      { status: 'SCHEDULED', scheduledFor: new Date(publishAt) },
      { author: principal.userId, action: 'SCHEDULED', body: publishAt },
      'content.scheduled',
      principal,
      scope,
    );
  }

  async publish(principal: Principal, versionId: string) {
    const scope = await this.loadScope(versionId);
    this.authorize(principal, 'content.publish', scope, 'AAL2');
    this.assertFrom(scope.status, ['APPROVED', 'READY_TO_PUBLISH', 'SCHEDULED']);
    const version = await this.prisma.lessonVersion.findUniqueOrThrow({ where: { id: versionId } });

    const result = await this.prisma.$transaction(async (tx) => {
      // Supersede any currently-published version of the same lesson.
      await tx.lessonVersion.updateMany({
        where: { lessonId: version.lessonId, status: 'PUBLISHED', id: { not: versionId } },
        data: { status: 'SUPERSEDED' },
      });
      const published = await tx.lessonVersion.update({
        where: { id: versionId },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      });
      await tx.lesson.update({ where: { id: version.lessonId }, data: { currentVersionId: versionId } });
      await tx.reviewComment.create({
        data: { lessonVersionId: versionId, authorUserId: principal.userId, action: 'PUBLISHED' },
      });
      return published;
    });
    await this.audit.record({
      actorUserId: principal.userId,
      actorRole: principal.roleKeys.join(','),
      action: 'content.published',
      targetType: 'LessonVersion',
      targetId: versionId,
      result: 'SUCCESS',
      before: { status: scope.status },
      after: { status: 'PUBLISHED' },
    });
    const course = await this.prisma.course.findUnique({ where: { id: scope.courseId }, select: { orgId: true, titleHi: true, titleEn: true } });
    const org = course?.orgId ? await this.prisma.organization.findUnique({ where: { id: course.orgId }, select: { headUserId: true } }) : null;
    const recipientIds = [scope.ownerUserId, ...(org?.headUserId && org.headUserId !== scope.ownerUserId ? [org.headUserId] : [])];
    await Promise.all(
      recipientIds.map((userId) =>
        this.notifications.emit({
          userId,
          category: 'CONTENT_WORKFLOW',
          titleHi: 'कंटेंट प्रकाशित हुआ',
          titleEn: 'Content published',
          bodyHi: `${result.titleHi} अब प्रकाशित है।`,
          bodyEn: `${result.titleEn} is now published.`,
          data: { versionId },
          email: (locale) => contentPublishedEmail(locale, result.titleHi, result.titleEn),
        }),
      ),
    );

    // Notify every student currently entitled to this course — new-lesson
    // engagement email, independent of the workflow-staff notice above.
    if (course) {
      const entitled = await this.prisma.entitlement.findMany({
        where: { courseId: scope.courseId, status: 'ACTIVE' },
        select: { userId: true },
        distinct: ['userId'],
      });
      await Promise.all(
        entitled.map(({ userId }) =>
          this.notifications.emit({
            userId,
            category: 'NEW_LESSON',
            titleHi: 'नया पाठ जुड़ा',
            titleEn: 'A new lesson was added',
            bodyHi: `${course.titleHi} में एक नया पाठ जोड़ा गया है।`,
            bodyEn: `A new lesson was added to ${course.titleEn}.`,
            data: { versionId, courseId: scope.courseId },
            email: (locale) => newLessonEmail(locale, course.titleHi, course.titleEn, result.titleHi, result.titleEn),
          }),
        ),
      );
    }
    return result;
  }

  async unpublish(principal: Principal, versionId: string, reason: string) {
    const scope = await this.loadScope(versionId);
    this.authorize(principal, 'content.unpublish', scope, 'AAL2');
    this.assertFrom(scope.status, ['PUBLISHED']);
    return this.transition(
      versionId,
      { status: 'UNPUBLISHED' },
      { author: principal.userId, action: 'UNPUBLISHED', body: reason },
      'content.unpublished',
      principal,
      scope,
    );
  }

  async archive(principal: Principal, versionId: string) {
    const scope = await this.loadScope(versionId);
    this.authorize(principal, 'content.archive', scope, 'AAL2');
    return this.transition(
      versionId,
      { status: 'ARCHIVED' },
      { author: principal.userId, action: 'ARCHIVED' },
      'content.archived',
      principal,
      scope,
    );
  }

  /** Create a fresh DRAFT version to revise already-published content safely. */
  async createNewVersion(principal: Principal, lessonId: string) {
    const latest = await this.prisma.lessonVersion.findFirst({
      where: { lessonId },
      orderBy: { versionNumber: 'desc' },
    });
    if (!latest) throw AppError.notFound('Lesson has no versions.');
    const scope = await this.loadScope(latest.id);
    const perm = this.editPermission(principal, scope);
    // edit permission is status-gated; a new version is always allowed for owners/admins,
    // so authorize on capability+scope using a synthetic DRAFT status.
    this.authorize(principal, perm, { ...scope, status: 'DRAFT' });
    return this.prisma.lessonVersion.create({
      data: {
        lessonId,
        versionNumber: latest.versionNumber + 1,
        status: 'DRAFT',
        titleHi: latest.titleHi,
        titleEn: latest.titleEn,
        summaryHi: latest.summaryHi,
        summaryEn: latest.summaryEn,
        estimatedMinutes: latest.estimatedMinutes,
        createdBy: principal.userId,
        changeSummary: 'New revision',
      },
    });
  }

  // ── Queues / listings ────────────────────────────────────────────────────
  async reviewQueue(principal: Principal) {
    const versions = await this.prisma.lessonVersion.findMany({
      where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
      orderBy: { submittedAt: 'asc' },
      include: {
        lesson: { include: { topic: { include: { chapter: { include: { subject: { include: { course: { select: { stateId: true, examId: true } } } } } } } } } },
      },
      take: 100,
    });
    // Filter to the reviewer's scope using the policy engine. Must include
    // stateId/examId here — a STATE- or EXAM-level assignment (e.g. "Reviewer
    // → all of Bihar") only pins that one field, and assignmentCovers()
    // requires the resource to carry every dimension the assignment pins.
    // Omitting stateId/examId made a broader assignment silently cover
    // nothing: it always mismatched on the (missing) stateId, so this queue
    // showed 0 items for anyone whose assignment wasn't itself subject/course
    // scoped — even though the same reviewer's approve/publish calls (which
    // go through loadScope()/authorize() and do pass the full scope) worked
    // fine once they somehow had the versionId in hand.
    const inScope = versions.filter((v) => {
      const subject = v.lesson.topic.chapter.subject;
      return this.authz.check(principal, 'content.review', {
        type: 'content',
        status: v.status,
        scope: { stateId: subject.course?.stateId, examId: subject.course?.examId, subjectId: subject.id, courseId: subject.courseId },
      }).allow;
    });
    return inScope.map((v) => ({
      versionId: v.id,
      lessonId: v.lessonId,
      titleHi: v.titleHi,
      titleEn: v.titleEn,
      status: v.status,
      courseId: v.lesson.topic.chapter.subject.courseId,
      subjectId: v.lesson.topic.chapter.subject.id,
      submittedAt: v.submittedAt?.toISOString() ?? null,
      createdBy: v.createdBy,
    }));
  }

  /** Cross-author oversight board: every active workflow item within the
   *  principal's review scope, for the Content-Ops Kanban. */
  async board(principal: Principal) {
    // Content managers (content.edit_all) see all in-progress content;
    // reviewers see only content within their assigned scope. Super Admin is
    // deliberately NOT exempt here — their role is platform oversight only,
    // not content management, so they hold neither permission and are denied
    // below like anyone else without one of these two capabilities.
    const hasManage = principal.permissionCodes.has('content.edit_all');
    const hasReview = principal.permissionCodes.has('content.review');
    if (!hasManage && !hasReview) {
      throw AppError.permissionDenied('Content operations require review or content-management permission.');
    }
    const versions = await this.prisma.lessonVersion.findMany({
      where: {
        status: {
          in: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'APPROVED', 'READY_TO_PUBLISH', 'SCHEDULED', 'PUBLISHED'],
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        lesson: { include: { topic: { include: { chapter: { include: { subject: { include: { course: { select: { orgId: true, stateId: true, examId: true } } } } } } } } } },
      },
      take: 200,
    });
    // Must include stateId/examId here — see the matching comment in
    // reviewQueue() above for why omitting them silently breaks any
    // assignment broader than subject/course (e.g. a STATE-wide reviewer).
    //
    // This is a pure SCOPE check (scopeCovered), not a permission+status
    // check (authz.check) — the board shows the full lifecycle of every item
    // in a reviewer's scope, including ones already APPROVED/PUBLISHED that
    // they can no longer 'content.review' (that permission's STATUS_ALLOWS
    // only covers SUBMITTED/UNDER_REVIEW). Gating board visibility on
    // 'content.review' + status made every approved item vanish from every
    // column — including "Ready / Published" — the moment it left review,
    // hiding it from the very Reviewer/Head who still needs to publish it.
    let inScope = hasManage
      ? versions
      : versions.filter((v) => {
          const subject = v.lesson.topic.chapter.subject;
          return scopeCovered(principal.assignments, {
            stateId: subject.course?.stateId,
            examId: subject.course?.examId,
            subjectId: subject.id,
            courseId: subject.courseId,
          });
        });
    // Tenant isolation: an institution-scoped actor sees their own org's content
    // PLUS platform-wide content (course orgId null, e.g. Content Admin's) — an
    // exact orgId match alone hid every platform item from an Academic Head.
    // Platform actors (Super Admin / Content Admin, no orgId) see all.
    if (!principal.isSuperAdmin && principal.orgId) {
      inScope = inScope.filter((v) => {
        const courseOrgId = v.lesson.topic.chapter.subject.course?.orgId;
        return courseOrgId == null || courseOrgId === principal.orgId;
      });
    }
    return inScope.map((v) => ({
      versionId: v.id,
      lessonId: v.lessonId,
      titleHi: v.titleHi,
      titleEn: v.titleEn,
      status: v.status,
      courseId: v.lesson.topic.chapter.subject.courseId,
      subjectId: v.lesson.topic.chapter.subject.id,
      updatedAt: v.updatedAt.toISOString(),
      createdBy: v.createdBy,
    }));
  }

  async myContent(principal: Principal) {
    const versions = await this.prisma.lessonVersion.findMany({
      where: { createdBy: principal.userId },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return versions.map((v) => ({
      versionId: v.id,
      lessonId: v.lessonId,
      titleHi: v.titleHi,
      titleEn: v.titleEn,
      status: v.status,
      rowVersion: v.rowVersion,
      updatedAt: v.updatedAt.toISOString(),
    }));
  }

  async timeline(principal: Principal, versionId: string) {
    await this.loadScope(versionId); // ensures existence
    return this.prisma.reviewComment.findMany({
      where: { lessonVersionId: versionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Read-only content preview — summary + playable/downloadable asset links —
   *  so a reviewer (or the author, or a content manager) can actually inspect
   *  what they're about to submit/approve/publish, not just its title. Reuses
   *  the same signed-URL pattern as the student player (short-lived, READY
   *  assets only); embeds resolve to their external URL directly. */
  async preview(principal: Principal, versionId: string) {
    this.authorizeAnyPreview(principal);
    const v = await this.prisma.lessonVersion.findUnique({
      where: { id: versionId },
      include: {
        lesson: { select: { lessonType: true, freePreview: true } },
        assets: { orderBy: { sequence: 'asc' }, include: { asset: true } },
      },
    });
    if (!v) throw AppError.notFound('Content version not found.');

    const assets = await Promise.all(
      v.assets.map(async (la) => ({
        role: la.role,
        assetType: la.asset.assetType,
        status: la.asset.status,
        url:
          la.asset.status === 'READY'
            ? (la.asset.embedUrl ?? (la.asset.storageKey ? await this.s3.presignGet(la.asset.storageKey, 300) : null))
            : null,
      })),
    );

    return {
      versionId: v.id,
      lessonType: v.lesson.lessonType,
      freePreview: v.lesson.freePreview,
      titleHi: v.titleHi,
      titleEn: v.titleEn,
      summaryHi: v.summaryHi,
      summaryEn: v.summaryEn,
      estimatedMinutes: v.estimatedMinutes,
      difficulty: v.difficulty,
      language: v.language,
      status: v.status,
      assets,
    };
  }
}
