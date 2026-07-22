import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import {
  upsertTestimonialSchema,
  upsertFaqSchema,
  upsertStudyContentTeaserSchema,
  type UpsertTestimonial,
  type UpsertFaq,
  type UpsertStudyContentTeaser,
} from '@rajyarank/contracts';
import { Public } from '../common/decorators/public.decorator';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { MarketingService } from './marketing.service';

/** Public, unauthenticated reads for the marketing homepage. */
@Controller()
export class MarketingController {
  constructor(private readonly marketing: MarketingService) {}

  @Public()
  @Get('testimonials')
  testimonials() {
    return this.marketing.publicTestimonials();
  }

  @Public()
  @Get('faqs')
  faqs() {
    return this.marketing.publicFaqs();
  }

  @Public()
  @Get('study-content-teasers')
  studyContentTeasers() {
    return this.marketing.publicStudyContentTeasers();
  }
}

/** Admin CRUD for marketing content. Gated by marketing.manage — Super Admin
 *  only, since homepage marketing copy is platform-wide, not institution-
 *  scoped like Content Admin/Academic Head's content permissions. */
@Controller('admin/marketing')
export class MarketingAdminController {
  constructor(private readonly marketing: MarketingService) {}

  @Get('testimonials')
  @RequirePermission('marketing.manage')
  listTestimonials() {
    return this.marketing.adminListTestimonials();
  }

  @Post('testimonials')
  @RequirePermission('marketing.manage')
  createTestimonial(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(upsertTestimonialSchema)) body: UpsertTestimonial,
  ) {
    return this.marketing.createTestimonial(principal.userId, body);
  }

  @Patch('testimonials/:id')
  @RequirePermission('marketing.manage')
  updateTestimonial(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(upsertTestimonialSchema.partial())) body: Partial<UpsertTestimonial>,
  ) {
    return this.marketing.updateTestimonial(id, body);
  }

  @Delete('testimonials/:id')
  @RequirePermission('marketing.manage')
  deleteTestimonial(@Param('id') id: string) {
    return this.marketing.deleteTestimonial(id);
  }

  @Get('faqs')
  @RequirePermission('marketing.manage')
  listFaqs() {
    return this.marketing.adminListFaqs();
  }

  @Post('faqs')
  @RequirePermission('marketing.manage')
  createFaq(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(upsertFaqSchema)) body: UpsertFaq,
  ) {
    return this.marketing.createFaq(principal.userId, body);
  }

  @Patch('faqs/:id')
  @RequirePermission('marketing.manage')
  updateFaq(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(upsertFaqSchema.partial())) body: Partial<UpsertFaq>,
  ) {
    return this.marketing.updateFaq(id, body);
  }

  @Delete('faqs/:id')
  @RequirePermission('marketing.manage')
  deleteFaq(@Param('id') id: string) {
    return this.marketing.deleteFaq(id);
  }

  @Get('study-content-teasers')
  @RequirePermission('marketing.manage')
  listStudyContentTeasers() {
    return this.marketing.adminListStudyContentTeasers();
  }

  @Post('study-content-teasers')
  @RequirePermission('marketing.manage')
  createStudyContentTeaser(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(upsertStudyContentTeaserSchema)) body: UpsertStudyContentTeaser,
  ) {
    return this.marketing.createStudyContentTeaser(principal.userId, body);
  }

  @Patch('study-content-teasers/:id')
  @RequirePermission('marketing.manage')
  updateStudyContentTeaser(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(upsertStudyContentTeaserSchema.partial())) body: Partial<UpsertStudyContentTeaser>,
  ) {
    return this.marketing.updateStudyContentTeaser(id, body);
  }

  @Delete('study-content-teasers/:id')
  @RequirePermission('marketing.manage')
  deleteStudyContentTeaser(@Param('id') id: string) {
    return this.marketing.deleteStudyContentTeaser(id);
  }
}
