import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Principal } from '@rajyarank/auth';
import {
  createExamBodySchema,
  createExamSchema,
  createStateSchema,
  verifyInstituteCodeSchema,
  type CreateExam,
  type CreateExamBody,
  type CreateState,
  type VerifyInstituteCode,
  type VerifyInstituteCodeResponse,
  type PartnerInstituteView,
  type PlatformStatsView,
  type CourseOutlineView,
} from '@rajyarank/contracts';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { CatalogueAdminService } from './catalogue-admin.service';
import { CoursesService } from '../courses/courses.service';

/** Read-only reference catalogue used by admin assignment UI and public pages. */
@Controller()
export class CatalogueController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coursesService: CoursesService,
  ) {}

  @Public()
  @Get('states')
  states() {
    return this.prisma.state.findMany({ orderBy: { code: 'asc' } });
  }

  @Public()
  @Get('exam-bodies')
  examBodies() {
    return this.prisma.examBody.findMany({ orderBy: { code: 'asc' } });
  }

  @Public()
  @Get('exams')
  exams() {
    return this.prisma.exam.findMany({ orderBy: { code: 'asc' } });
  }

  /** Public free resource (§8.5): published current affairs, newest first. */
  @Public()
  @Get('current-affairs')
  async currentAffairs() {
    const rows = await this.prisma.currentAffair.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { dateFor: 'desc' },
      take: 40,
      select: {
        id: true, dateFor: true, titleHi: true, titleEn: true, bodyHi: true, bodyEn: true, category: true, scope: true,
        publishedAt: true, createdBy: true,
      },
    });
    const orgNameByCreator = await this.orgNamesByCreator(rows.map((r) => r.createdBy));
    return rows.map(({ publishedAt, createdBy, ...c }) => ({
      ...c,
      publishedAt: publishedAt?.toISOString() ?? null,
      orgName: (createdBy && orgNameByCreator.get(createdBy)) ?? null,
    }));
  }

  /** All published current-affair ids, for sitemap generation — deliberately
   *  unbounded (unlike currentAffairs()'s take:40 feed cap) so older items
   *  don't silently age out of the sitemap while their detail pages stay
   *  live. Must stay registered before current-affairs/:id below, or Nest
   *  would match "sitemap-ids" as an :id value instead. */
  @Public()
  @Get('current-affairs/sitemap-ids')
  async currentAffairSitemapIds() {
    const rows = await this.prisma.currentAffair.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { dateFor: 'desc' },
      select: { id: true, publishedAt: true },
    });
    return rows.map((r) => ({ id: r.id, publishedAt: r.publishedAt?.toISOString() ?? null }));
  }

  /** Single published current affair, for its own SEO-indexable detail page.
   *  Returns null (not a 404) on any non-published/missing id — same
   *  convention as courses/:id/outline — so the page can call notFound(). */
  @Public()
  @Get('current-affairs/:id')
  async currentAffair(@Param('id') id: string) {
    const row = await this.prisma.currentAffair.findFirst({
      where: { id, status: 'PUBLISHED' },
      select: {
        id: true, dateFor: true, titleHi: true, titleEn: true, bodyHi: true, bodyEn: true, category: true, scope: true,
        source: true, publishedAt: true, createdAt: true, updatedAt: true, createdBy: true,
      },
    });
    if (!row) return null;
    const orgNameByCreator = await this.orgNamesByCreator([row.createdBy]);
    const { publishedAt, createdAt, updatedAt, createdBy, ...c } = row;
    return {
      ...c,
      publishedAt: publishedAt?.toISOString() ?? null,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      orgName: (createdBy && orgNameByCreator.get(createdBy)) ?? null,
    };
  }

  /** CurrentAffair.createdBy has no Prisma relation to User (plain scalar
   *  FK, no schema change needed for this feature) — resolve institute
   *  attribution with a small side query instead of a relational include. */
  private async orgNamesByCreator(createdByIds: (string | null)[]): Promise<Map<string, string>> {
    const ids = [...new Set(createdByIds.filter((id): id is string => !!id))];
    if (ids.length === 0) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, org: { select: { name: true } } },
    });
    const map = new Map<string, string>();
    for (const u of users) if (u.org?.name) map.set(u.id, u.org.name);
    return map;
  }

  /** Institutes whose KYC was rejected — excluded from every public
   *  discovery surface below so a rejected institute's courses can't gain
   *  new buyers while payments.service.ts blocks checkout anyway; only
   *  REJECTED is excluded, not PENDING/unverified, so institutes still
   *  completing onboarding aren't retroactively delisted. */
  private async rejectedKycOrgIds(): Promise<string[]> {
    const rows = await this.prisma.instituteLinkedAccount.findMany({ where: { kycStatus: 'REJECTED' }, select: { orgId: true } });
    return rows.map((r) => r.orgId);
  }

  /** Publicly discoverable courses (active + public only). */
  @Public()
  @Get('courses')
  async courses() {
    const rejectedOrgIds = await this.rejectedKycOrgIds();
    const rows = await this.prisma.course.findMany({
      where: { deletedAt: null, status: 'ACTIVE', visibility: 'PUBLIC', OR: [{ orgId: null }, { orgId: { notIn: rejectedOrgIds } }] },
      orderBy: { sequence: 'asc' },
      select: {
        id: true, code: true, titleHi: true, titleEn: true, stateId: true, examId: true, orgId: true,
        createdAt: true, organization: { select: { name: true } },
      },
    });
    const courseIds = rows.map((r) => r.id);
    const [ratingAgg, enrollmentAgg] = await Promise.all([
      this.prisma.courseRating.groupBy({ by: ['courseId'], where: { courseId: { in: courseIds }, status: 'VISIBLE' }, _avg: { rating: true }, _count: { rating: true } }),
      this.prisma.entitlement.groupBy({ by: ['courseId'], where: { courseId: { in: courseIds }, status: 'ACTIVE' }, _count: { courseId: true } }),
    ]);
    const ratingByCourse = new Map(ratingAgg.map((r) => [r.courseId, { avgRating: r._avg.rating ?? 0, ratingCount: r._count.rating }]));
    const enrollmentByCourse = new Map(enrollmentAgg.map((e) => [e.courseId as string, e._count.courseId]));
    return rows.map(({ organization, createdAt, ...c }) => ({
      ...c,
      createdAt: createdAt.toISOString(),
      orgName: organization?.name ?? null,
      avgRating: ratingByCourse.get(c.id)?.avgRating ?? 0,
      ratingCount: ratingByCourse.get(c.id)?.ratingCount ?? 0,
      enrollmentCount: enrollmentByCourse.get(c.id) ?? 0,
    }));
  }

  /** Partner-institutes directory: active orgs with at least one active
   *  course, and how many public vs. institute-priced products they sell.
   *  No PII — name and counts only. */
  @Public()
  @Get('institutes')
  async institutes(): Promise<PartnerInstituteView[]> {
    const rejectedOrgIds = await this.rejectedKycOrgIds();
    const orgs = await this.prisma.organization.findMany({
      where: { status: 'ACTIVE', id: { notIn: rejectedOrgIds } },
      select: { id: true, name: true, courses: { where: { deletedAt: null, status: 'ACTIVE' }, select: { id: true } } },
    });
    const active = orgs.filter((o) => o.courses.length > 0);
    if (active.length === 0) return [];

    const courseToOrg = new Map<string, string>();
    for (const o of active) for (const c of o.courses) courseToOrg.set(c.id, o.id);

    const products = await this.prisma.product.findMany({
      where: { courseId: { in: [...courseToOrg.keys()] }, active: true },
      select: { courseId: true, audience: true },
    });

    const counts = new Map<string, { publicCount: number; instituteCount: number }>();
    for (const o of active) counts.set(o.id, { publicCount: 0, instituteCount: 0 });
    for (const p of products) {
      const orgId = p.courseId ? courseToOrg.get(p.courseId) : undefined;
      if (!orgId) continue;
      const c = counts.get(orgId)!;
      if (p.audience === 'PUBLIC') c.publicCount++;
      else c.instituteCount++;
    }

    return active.map((o) => ({ id: o.id, name: o.name, ...counts.get(o.id)! }));
  }

  /** Real, live counts for the marketing page's trust strip (active students,
   *  active institutes with a live course) — deliberately NOT a page-view
   *  counter, since no visitor-tracking infra exists in this codebase; see
   *  PlatformStatsView's doc comment for the reasoning. */
  @Public()
  @Get('platform-stats')
  async platformStats(): Promise<PlatformStatsView> {
    const rejectedOrgIds = await this.rejectedKycOrgIds();
    const [students, orgs] = await Promise.all([
      this.prisma.user.count({ where: { kind: 'STUDENT', status: 'ACTIVE', deletedAt: null } }),
      this.prisma.organization.findMany({
        where: { status: 'ACTIVE', id: { notIn: rejectedOrgIds } },
        select: { courses: { where: { deletedAt: null, status: 'ACTIVE' }, select: { id: true } } },
      }),
    ]);
    const institutes = orgs.filter((o) => o.courses.length > 0).length;
    return { students, institutes };
  }

  /** Preview an institute price-redemption code against a course, without
   *  requiring login. The purchase itself always re-validates the code
   *  server-side (payments.service.ts createOrder) — this is a UX preview,
   *  never the authoritative check. Throttled against brute-forcing codes. */
  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('courses/:id/verify-institute-code')
  async verifyInstituteCode(
    @Param('id') courseId: string,
    @Body(new ZodValidationPipe(verifyInstituteCodeSchema)) body: VerifyInstituteCode,
  ): Promise<VerifyInstituteCodeResponse> {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, deletedAt: null }, select: { orgId: true } });
    if (!course?.orgId) return { valid: false };

    const org = await this.prisma.organization.findUnique({ where: { id: course.orgId }, select: { accessCode: true, name: true } });
    if (!org?.accessCode || org.accessCode !== body.code.trim()) return { valid: false };

    const product = await this.prisma.product.findFirst({
      where: { courseId, kind: 'COURSE', audience: 'INSTITUTE', active: true },
    });
    if (!product) return { valid: false, orgName: org.name };

    return {
      valid: true,
      orgName: org.name,
      product: {
        id: product.id,
        kind: product.kind,
        courseId: product.courseId,
        examId: product.examId,
        titleHi: product.titleHi,
        titleEn: product.titleEn,
        priceMinor: product.priceMinor,
        originalPriceMinor: product.originalPriceMinor,
        currency: product.currency,
        validityDays: product.validityDays,
        accessType: product.accessType,
        audience: product.audience,
      },
    };
  }

  /** Course outline: subjects → chapters → topics → published lessons, plus
   *  learning-design fields — this is what a prospective (pre-purchase)
   *  student sees, so only ever surfaces PUBLISHED lesson content. */
  @Public()
  @Get('courses/:id/outline')
  async outline(@Param('id') id: string): Promise<CourseOutlineView | null> {
    const course = await this.prisma.course.findFirst({
      where: { id, deletedAt: null, status: 'ACTIVE', visibility: 'PUBLIC' },
      select: {
        id: true,
        code: true,
        titleHi: true,
        titleEn: true,
        descHi: true,
        descEn: true,
        stateId: true,
        examId: true,
        orgId: true,
        createdAt: true,
        organization: { select: { name: true } },
        coursePromiseHi: true,
        coursePromiseEn: true,
        learningOutcomes: true,
        subjects: {
          where: { deletedAt: null },
          orderBy: { sequence: 'asc' },
          select: {
            id: true,
            nameHi: true,
            nameEn: true,
            chapters: {
              where: { deletedAt: null },
              orderBy: { sequence: 'asc' },
              select: {
                id: true,
                nameHi: true,
                nameEn: true,
                topics: {
                  where: { deletedAt: null },
                  orderBy: { sequence: 'asc' },
                  select: {
                    id: true,
                    nameHi: true,
                    nameEn: true,
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
        },
      },
    });
    if (!course) return null;
    const { organization, createdAt, ...rest } = course;
    return {
      ...rest,
      createdAt: createdAt.toISOString(),
      orgName: organization?.name ?? null,
      subjects: course.subjects.map((s) => ({
        ...s,
        chapters: s.chapters.map((c) => ({
          ...c,
          topics: c.topics.map((t) => ({
            ...t,
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
  }

  /** Backs the Course Studio's "Open student preview" — a signed, short-lived
   *  token (minted by an authorized course.manage principal) is the only
   *  thing that lets this bypass the ACTIVE+PUBLIC gate `outline()` enforces,
   *  so a course can be previewed before it's actually published. Returns
   *  null (not a 404) on any invalid/expired/mismatched token so the caller
   *  can fall back to the normal public flow. */
  @Public()
  @Get('courses/:id/preview')
  previewCourse(@Param('id') id: string, @Query('token') token?: string) {
    if (!token) return null;
    return this.coursesService.previewData(id, token);
  }
}

/** Admin catalogue — states/exam-bodies are shared, platform-wide reference
 *  data (fixed real-world lists); exams are institution-owned (`Exam.orgId`),
 *  so the admin exam list/create below is scoped to the caller's own
 *  institution (or, for platform staff with no orgId, the platform-wide set).
 *  All gated by `course.manage` (held by Content Admin and Academic Head —
 *  Super Admin deliberately doesn't, platform-oversight roles stay out of
 *  operational content work). State creation additionally requires no orgId
 *  (see CatalogueAdminService.requirePlatformStaff) — states are a fixed,
 *  already-complete list nobody should be adding ad hoc entries to. */
@Controller('admin/catalogue')
export class CatalogueAdminController {
  constructor(private readonly admin: CatalogueAdminService) {}

  @Get('exams')
  @RequirePermission('course.manage')
  listExams(@CurrentPrincipal() principal: Principal) {
    return this.admin.listExams(principal);
  }

  @Post('states')
  @RequirePermission('course.manage')
  createState(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(createStateSchema)) body: CreateState,
  ) {
    return this.admin.createState(principal, body);
  }

  @Post('exam-bodies')
  @RequirePermission('course.manage')
  createExamBody(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(createExamBodySchema)) body: CreateExamBody,
  ) {
    return this.admin.createExamBody(principal, body);
  }

  @Post('exams')
  @RequirePermission('course.manage')
  createExam(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(createExamSchema)) body: CreateExam,
  ) {
    return this.admin.createExam(principal, body);
  }
}
