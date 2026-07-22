import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { upsertCoursePricingSchema, type UpsertCoursePricing } from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { CoursePricingService } from './course-pricing.service';

@Controller('admin/courses')
export class CoursePricingController {
  constructor(private readonly pricing: CoursePricingService) {}

  @Get(':courseId/pricing')
  @RequirePermission('course.manage')
  get(
    @CurrentPrincipal() principal: Principal,
    @Param('courseId') courseId: string,
    @Query('audience') audience?: 'PUBLIC' | 'INSTITUTE',
  ) {
    return this.pricing.get(principal, courseId, audience === 'INSTITUTE' ? 'INSTITUTE' : 'PUBLIC');
  }

  @Put(':courseId/pricing')
  @RequirePermission('course.manage', { assurance: 'AAL2' })
  upsert(
    @CurrentPrincipal() principal: Principal,
    @Param('courseId') courseId: string,
    @Body(new ZodValidationPipe(upsertCoursePricingSchema)) body: UpsertCoursePricing,
  ) {
    return this.pricing.upsert(principal, courseId, body);
  }
}
