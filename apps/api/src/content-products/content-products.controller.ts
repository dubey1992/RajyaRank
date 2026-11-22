import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { upsertIndividualPricingSchema, upsertContentPackSchema, type UpsertIndividualPricingInput, type UpsertContentPackInput } from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { Public } from '../common/decorators/public.decorator';
import { ContentProductsService } from './content-products.service';

/** Per-lesson/per-test "sell individually" pricing, and curated Content
 *  Packs — org-scoped exactly like every other course.manage endpoint
 *  (see ContentProductsService's own scope-check comments). */
@Controller('admin')
export class ContentProductsAdminController {
  constructor(private readonly contentProducts: ContentProductsService) {}

  @Get('lessons/:id/individual-pricing')
  @RequirePermission('course.manage')
  getLessonPricing(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.contentProducts.getLessonPricing(principal, id);
  }

  @Put('lessons/:id/individual-pricing')
  @RequirePermission('course.manage', { assurance: 'AAL2' })
  upsertLessonPricing(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(upsertIndividualPricingSchema)) dto: UpsertIndividualPricingInput,
  ) {
    return this.contentProducts.upsertLessonPricing(principal, id, dto);
  }

  @Get('tests/:id/individual-pricing')
  @RequirePermission('test.create')
  getTestPricing(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.contentProducts.getTestPricing(principal, id);
  }

  @Put('tests/:id/individual-pricing')
  @RequirePermission('test.create', { assurance: 'AAL2' })
  upsertTestPricing(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(upsertIndividualPricingSchema)) dto: UpsertIndividualPricingInput,
  ) {
    return this.contentProducts.upsertTestPricing(principal, id, dto);
  }

  @Get('content-packs')
  @RequirePermission('course.manage')
  listPacks(@CurrentPrincipal() principal: Principal) {
    return this.contentProducts.listPacks(principal);
  }

  // Typeahead search backing the pack item picker — see
  // ContentProductsService#searchLessonsForPack for why these exist (same
  // reasoning as ConceptsController's lessons/questions search).
  @Get('content-packs/search-lessons')
  @RequirePermission('course.manage')
  searchLessonsForPack(@Query('q') q: string) {
    return this.contentProducts.searchLessonsForPack(q ?? '');
  }

  @Get('content-packs/search-tests')
  @RequirePermission('course.manage')
  searchTestsForPack(@Query('q') q: string) {
    return this.contentProducts.searchTestsForPack(q ?? '');
  }

  @Post('content-packs')
  @RequirePermission('course.manage', { assurance: 'AAL2' })
  createPack(@CurrentPrincipal() principal: Principal, @Body(new ZodValidationPipe(upsertContentPackSchema)) dto: UpsertContentPackInput) {
    return this.contentProducts.createPack(principal, dto);
  }

  @Put('content-packs/:id')
  @RequirePermission('course.manage', { assurance: 'AAL2' })
  updatePack(@CurrentPrincipal() principal: Principal, @Param('id') id: string, @Body(new ZodValidationPipe(upsertContentPackSchema)) dto: UpsertContentPackInput) {
    return this.contentProducts.updatePack(principal, id, dto);
  }
}

/** Public, unauthenticated — the real replacement for the old
 *  StudyContentTeaser-backed homepage section. */
@Controller('content-products')
export class ContentProductsPublicController {
  constructor(private readonly contentProducts: ContentProductsService) {}

  @Get()
  @Public()
  list() {
    return this.contentProducts.listPublic();
  }
}
