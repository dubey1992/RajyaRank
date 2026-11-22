import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type {
  ContentPackAdminView,
  ContentPackItemSearchResult,
  ContentProductView,
  IndividualPricingView,
  UpsertContentPackInput,
  UpsertIndividualPricingInput,
} from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../authz/authorization.service';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors/app-error';

/**
 * Individual Content Purchase — admin authoring (per-lesson/per-test
 * "sell individually" pricing, and curated packs of several) + the public
 * listing that replaced the old fake StudyContentTeaser homepage section.
 *
 * A pack's items are themselves real LESSON/TEST-kind Products (auto-created,
 * `active: false`, if the content isn't independently sellable on its own
 * yet) — see ProductBundleItem's schema comment for why: it lets a bundle
 * purchase grant one ordinary Entitlement per item's own productId, reusing
 * Entitlement's existing `@@unique([userId, productId])` guarantee instead of
 * needing a second entitlement shape just for bundle members.
 */
@Injectable()
export class ContentProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
    private readonly audit: AuditService,
  ) {}

  private assertCourseManage(principal: Principal, scope: { orgId?: string; stateId?: string; examId?: string; courseId?: string }) {
    const decision = this.authz.check(principal, 'course.manage', { type: 'course', scope });
    if (!decision.allow) throw AppError.permissionDenied('Resource is outside your assigned scope.');
  }

  /** Same shape as assertCourseManage, keyed on `test.create` — the
   *  permission test-builder.service.ts itself uses for all test authoring,
   *  including edits (not just creation) — so a test's individual-pricing
   *  endpoint is gated consistently with every other test-management action,
   *  not with a course-authoring permission a test-only role might not hold. */
  private assertTestManage(principal: Principal, scope: { orgId?: string; examId?: string; courseId?: string }) {
    const decision = this.authz.check(principal, 'test.create', { type: 'test', scope });
    if (!decision.allow) throw AppError.permissionDenied('Resource is outside your assigned scope.');
  }

  /** A lesson's owning course scope, walked the same way
   *  student.service.ts#courseIdForLesson does, plus the course's own
   *  org/state/exam for the permission check. */
  private async lessonScope(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        currentVersion: { select: { status: true } },
        topic: { select: { chapter: { select: { subject: { select: { course: true } } } } } },
      },
    });
    if (!lesson) throw AppError.notFound('Lesson not found.');
    const course = lesson.topic.chapter.subject.course;
    return {
      lesson,
      course,
      scope: { orgId: course.orgId ?? undefined, stateId: course.stateId, examId: course.examId, courseId: course.id },
    };
  }

  async getLessonPricing(principal: Principal, lessonId: string): Promise<IndividualPricingView> {
    const { scope } = await this.lessonScope(lessonId);
    this.assertCourseManage(principal, scope);
    const product = await this.prisma.product.findFirst({ where: { lessonId, kind: 'LESSON' } });
    return this.toIndividualPricingView(product);
  }

  async upsertLessonPricing(principal: Principal, lessonId: string, dto: UpsertIndividualPricingInput): Promise<IndividualPricingView> {
    const { lesson, course, scope } = await this.lessonScope(lessonId);
    this.assertCourseManage(principal, scope);
    if (dto.enabled && lesson.currentVersion?.status !== 'PUBLISHED') {
      throw AppError.conflict('Only a published lesson can be sold individually.');
    }

    const existing = await this.prisma.product.findFirst({ where: { lessonId, kind: 'LESSON', audience: dto.audience } });
    if (!dto.enabled) {
      if (existing) await this.prisma.product.update({ where: { id: existing.id }, data: { active: false } });
      return this.toIndividualPricingView(existing ? { ...existing, active: false } : null);
    }

    const titleHi = lesson.currentVersion ? (await this.prisma.lessonVersion.findUnique({ where: { id: lesson.currentVersionId! } }))!.titleHi : 'Lesson';
    const data = {
      kind: 'LESSON' as const,
      lessonId,
      orgId: course.orgId ?? null,
      audience: dto.audience,
      titleHi,
      titleEn: lesson.currentVersion ? (await this.prisma.lessonVersion.findUnique({ where: { id: lesson.currentVersionId! } }))!.titleEn : 'Lesson',
      priceMinor: dto.priceMinor,
      originalPriceMinor: dto.originalPriceMinor ?? null,
      active: true,
    };
    const product = existing
      ? await this.prisma.product.update({ where: { id: existing.id }, data })
      : await this.prisma.product.create({ data });

    await this.audit.record({
      actorUserId: principal.userId,
      action: 'content.individual_pricing_upsert',
      targetType: 'Product',
      targetId: product.id,
      result: 'SUCCESS',
      after: { lessonId, priceMinor: dto.priceMinor, audience: dto.audience },
    });
    return this.toIndividualPricingView(product);
  }

  private async testScope(testId: string) {
    const test = await this.prisma.test.findUnique({ where: { id: testId }, include: { currentVersion: { select: { status: true } } } });
    if (!test) throw AppError.notFound('Test not found.');
    return { test, scope: { orgId: test.orgId ?? undefined, examId: test.examId, courseId: test.courseId ?? undefined } };
  }

  async getTestPricing(principal: Principal, testId: string): Promise<IndividualPricingView> {
    const { scope } = await this.testScope(testId);
    this.assertTestManage(principal, scope);
    const product = await this.prisma.product.findFirst({ where: { testId, kind: 'TEST' } });
    return this.toIndividualPricingView(product);
  }

  async upsertTestPricing(principal: Principal, testId: string, dto: UpsertIndividualPricingInput): Promise<IndividualPricingView> {
    const { test, scope } = await this.testScope(testId);
    this.assertTestManage(principal, scope);
    if (dto.enabled && test.currentVersion?.status !== 'PUBLISHED') {
      throw AppError.conflict('Only a published test can be sold individually.');
    }

    const existing = await this.prisma.product.findFirst({ where: { testId, kind: 'TEST', audience: dto.audience } });
    if (!dto.enabled) {
      if (existing) await this.prisma.product.update({ where: { id: existing.id }, data: { active: false } });
      return this.toIndividualPricingView(existing ? { ...existing, active: false } : null);
    }

    const data = {
      kind: 'TEST' as const,
      testId,
      orgId: test.orgId ?? null,
      examId: test.examId,
      audience: dto.audience,
      titleHi: test.titleHi,
      titleEn: test.titleEn,
      priceMinor: dto.priceMinor,
      originalPriceMinor: dto.originalPriceMinor ?? null,
      active: true,
    };
    const product = existing
      ? await this.prisma.product.update({ where: { id: existing.id }, data })
      : await this.prisma.product.create({ data });

    await this.audit.record({
      actorUserId: principal.userId,
      action: 'content.individual_pricing_upsert',
      targetType: 'Product',
      targetId: product.id,
      result: 'SUCCESS',
      after: { testId, priceMinor: dto.priceMinor, audience: dto.audience },
    });
    return this.toIndividualPricingView(product);
  }

  private toIndividualPricingView(product: { id: string; priceMinor: number; originalPriceMinor: number | null; audience: 'PUBLIC' | 'INSTITUTE'; active: boolean } | null): IndividualPricingView {
    if (!product || !product.active) return { enabled: false, productId: null, priceMinor: null, originalPriceMinor: null, audience: null };
    return { enabled: true, productId: product.id, priceMinor: product.priceMinor, originalPriceMinor: product.originalPriceMinor, audience: product.audience };
  }

  // ── Content Packs ────────────────────────────────────────────────────

  /** Typeahead search backing the pack item picker — published lessons only,
   *  title-matched. Not itself the authorization boundary: ensureItemProduct
   *  (below) re-checks the caller's actual scope at create/update time, same
   *  defense-in-depth pattern as ConceptsService.searchLessons(). */
  async searchLessonsForPack(q: string): Promise<ContentPackItemSearchResult[]> {
    const query = q.trim();
    if (query.length < 2) return [];
    const rows = await this.prisma.lesson.findMany({
      where: {
        deletedAt: null,
        currentVersion: {
          status: 'PUBLISHED',
          OR: [{ titleHi: { contains: query, mode: 'insensitive' } }, { titleEn: { contains: query, mode: 'insensitive' } }],
        },
      },
      take: 20,
      include: { currentVersion: true, topic: { include: { chapter: { include: { subject: { include: { course: true } } } } } } },
    });
    return rows
      .filter((l) => l.currentVersion)
      .map((l) => ({
        id: l.id,
        titleHi: l.currentVersion!.titleHi,
        titleEn: l.currentVersion!.titleEn,
        courseTitleHi: l.topic.chapter.subject.course.titleHi,
        courseTitleEn: l.topic.chapter.subject.course.titleEn,
      }));
  }

  /** Same idea as searchLessonsForPack but for standalone tests. */
  async searchTestsForPack(q: string): Promise<ContentPackItemSearchResult[]> {
    const query = q.trim();
    if (query.length < 2) return [];
    const rows = await this.prisma.test.findMany({
      where: {
        deletedAt: null,
        currentVersion: { status: 'PUBLISHED' },
        OR: [{ titleHi: { contains: query, mode: 'insensitive' } }, { titleEn: { contains: query, mode: 'insensitive' } }],
      },
      take: 20,
    });
    return rows.map((t) => ({ id: t.id, titleHi: t.titleHi, titleEn: t.titleEn, courseTitleHi: null, courseTitleEn: null }));
  }

  /** Ensures a real LESSON/TEST-kind Product exists for this item (creating
   *  an `active: false` one — not independently listed, only reachable via
   *  the pack — if it has no individual-pricing product yet), then returns
   *  its id for a ProductBundleItem row to reference. */
  private async ensureItemProduct(principal: Principal, item: { kind: 'LESSON' | 'TEST'; id: string }): Promise<{ productId: string; titleHi: string; titleEn: string }> {
    if (item.kind === 'LESSON') {
      const { lesson, course, scope } = await this.lessonScope(item.id);
      this.assertCourseManage(principal, scope);
      const existing = await this.prisma.product.findFirst({ where: { lessonId: item.id, kind: 'LESSON', audience: 'PUBLIC' } });
      if (existing) return { productId: existing.id, titleHi: existing.titleHi, titleEn: existing.titleEn };
      const version = lesson.currentVersionId ? await this.prisma.lessonVersion.findUnique({ where: { id: lesson.currentVersionId } }) : null;
      const created = await this.prisma.product.create({
        data: {
          kind: 'LESSON',
          lessonId: item.id,
          orgId: course.orgId ?? null,
          audience: 'PUBLIC',
          titleHi: version?.titleHi ?? 'Lesson',
          titleEn: version?.titleEn ?? 'Lesson',
          priceMinor: 0,
          active: false,
        },
      });
      return { productId: created.id, titleHi: created.titleHi, titleEn: created.titleEn };
    }
    const { test, scope } = await this.testScope(item.id);
    this.assertTestManage(principal, scope);
    const existing = await this.prisma.product.findFirst({ where: { testId: item.id, kind: 'TEST', audience: 'PUBLIC' } });
    if (existing) return { productId: existing.id, titleHi: existing.titleHi, titleEn: existing.titleEn };
    const created = await this.prisma.product.create({
      data: {
        kind: 'TEST',
        testId: item.id,
        orgId: test.orgId ?? null,
        examId: test.examId,
        audience: 'PUBLIC',
        titleHi: test.titleHi,
        titleEn: test.titleEn,
        priceMinor: 0,
        active: false,
      },
    });
    return { productId: created.id, titleHi: created.titleHi, titleEn: created.titleEn };
  }

  async createPack(principal: Principal, dto: UpsertContentPackInput): Promise<ContentPackAdminView> {
    // v1 simplification: any staff holding course.manage anywhere can create
    // a pack (packs can span courses/exams, so there's no one scope to check
    // against like a single course/test has) — narrower per-item ownership
    // is still enforced by ensureItemProduct's own lessonScope/testScope
    // calls below, which reject an item outside the caller's assigned scope.
    this.assertCourseManage(principal, {});
    const resolvedItems = await Promise.all(dto.items.map((i) => this.ensureItemProduct(principal, i)));

    const bundle = await this.prisma.product.create({
      data: {
        kind: 'BUNDLE',
        audience: dto.audience,
        titleHi: dto.titleHi,
        titleEn: dto.titleEn,
        priceMinor: dto.priceMinor,
        originalPriceMinor: dto.originalPriceMinor ?? null,
        active: dto.active,
        bundleItems: { create: resolvedItems.map((r) => ({ itemProductId: r.productId })) },
      },
    });
    await this.audit.record({
      actorUserId: principal.userId,
      action: 'content.pack_created',
      targetType: 'Product',
      targetId: bundle.id,
      result: 'SUCCESS',
      after: { titleEn: dto.titleEn, itemCount: dto.items.length },
    });
    return this.toPackView(bundle.id);
  }

  async updatePack(principal: Principal, id: string, dto: UpsertContentPackInput): Promise<ContentPackAdminView> {
    this.assertCourseManage(principal, {});
    const existing = await this.prisma.product.findFirst({ where: { id, kind: 'BUNDLE' } });
    if (!existing) throw AppError.notFound('Pack not found.');
    const resolvedItems = await Promise.all(dto.items.map((i) => this.ensureItemProduct(principal, i)));

    await this.prisma.$transaction([
      this.prisma.product.update({
        where: { id },
        data: {
          titleHi: dto.titleHi,
          titleEn: dto.titleEn,
          priceMinor: dto.priceMinor,
          originalPriceMinor: dto.originalPriceMinor ?? null,
          audience: dto.audience,
          active: dto.active,
        },
      }),
      this.prisma.productBundleItem.deleteMany({ where: { bundleProductId: id } }),
      this.prisma.productBundleItem.createMany({ data: resolvedItems.map((r) => ({ bundleProductId: id, itemProductId: r.productId })) }),
    ]);
    await this.audit.record({ actorUserId: principal.userId, action: 'content.pack_updated', targetType: 'Product', targetId: id, result: 'SUCCESS' });
    return this.toPackView(id);
  }

  async listPacks(principal: Principal): Promise<ContentPackAdminView[]> {
    this.assertCourseManage(principal, {});
    const bundles = await this.prisma.product.findMany({ where: { kind: 'BUNDLE' }, orderBy: { createdAt: 'desc' } });
    return Promise.all(bundles.map((b) => this.toPackView(b.id)));
  }

  private async toPackView(bundleProductId: string): Promise<ContentPackAdminView> {
    const bundle = await this.prisma.product.findUniqueOrThrow({ where: { id: bundleProductId } });
    const items = await this.prisma.productBundleItem.findMany({ where: { bundleProductId }, include: { itemProduct: true } });
    return {
      id: bundle.id,
      titleHi: bundle.titleHi,
      titleEn: bundle.titleEn,
      priceMinor: bundle.priceMinor,
      originalPriceMinor: bundle.originalPriceMinor,
      audience: bundle.audience,
      active: bundle.active,
      items: items.map((i) => ({
        kind: i.itemProduct.lessonId ? 'LESSON' : 'TEST',
        id: (i.itemProduct.lessonId ?? i.itemProduct.testId)!,
        titleHi: i.itemProduct.titleHi,
        titleEn: i.itemProduct.titleEn,
      })),
    };
  }

  // ── Public listing (replaces the old fake StudyContentTeaser section) ──

  async listPublic(): Promise<ContentProductView[]> {
    const products = await this.prisma.product.findMany({
      where: { active: true, audience: 'PUBLIC', kind: { in: ['LESSON', 'TEST', 'BUNDLE'] } },
      orderBy: { createdAt: 'desc' },
      take: 48,
    });
    const bundleIds = products.filter((p) => p.kind === 'BUNDLE').map((p) => p.id);
    const bundleItemsByProduct = new Map<string, { kind: 'LESSON' | 'TEST'; id: string; titleHi: string; titleEn: string }[]>();
    if (bundleIds.length) {
      const items = await this.prisma.productBundleItem.findMany({ where: { bundleProductId: { in: bundleIds } }, include: { itemProduct: true } });
      for (const item of items) {
        const list = bundleItemsByProduct.get(item.bundleProductId) ?? [];
        list.push({
          kind: item.itemProduct.lessonId ? 'LESSON' : 'TEST',
          id: (item.itemProduct.lessonId ?? item.itemProduct.testId)!,
          titleHi: item.itemProduct.titleHi,
          titleEn: item.itemProduct.titleEn,
        });
        bundleItemsByProduct.set(item.bundleProductId, list);
      }
    }
    return products.map((p) => ({
      id: p.id,
      kind: p.kind as 'LESSON' | 'TEST' | 'BUNDLE',
      titleHi: p.titleHi,
      titleEn: p.titleEn,
      priceMinor: p.priceMinor,
      originalPriceMinor: p.originalPriceMinor,
      currency: p.currency,
      audience: p.audience,
      lessonId: p.lessonId,
      testId: p.testId,
      items: p.kind === 'BUNDLE' ? (bundleItemsByProduct.get(p.id) ?? []) : undefined,
    }));
  }
}
