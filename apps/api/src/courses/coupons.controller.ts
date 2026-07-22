import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { createCouponSchema, type CreateCoupon } from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { CoursePricingService } from './course-pricing.service';

/** Kept as a separate top-level path (not nested under admin/courses) so it can
 *  never collide with CoursesController's single-segment `:id` route. */
@Controller('admin/coupons')
export class CouponsController {
  constructor(private readonly pricing: CoursePricingService) {}

  @Get()
  @RequirePermission('course.manage')
  list(@CurrentPrincipal() principal: Principal, @Query('courseId') courseId?: string) {
    return this.pricing.listCoupons(principal, courseId);
  }

  @Post()
  @RequirePermission('course.manage', { assurance: 'AAL2' })
  create(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(createCouponSchema)) body: CreateCoupon,
  ) {
    return this.pricing.createCoupon(principal, body);
  }
}
