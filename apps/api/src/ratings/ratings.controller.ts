import { Body, Controller, Get, Param, Post, Patch } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { moderateRatingSchema, submitRatingSchema, type ModerateRating, type SubmitRating } from '@rajyarank/contracts';
import { Public } from '../common/decorators/public.decorator';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { RatingsService } from './ratings.service';

@Controller()
export class RatingsController {
  constructor(private readonly ratings: RatingsService) {}

  @Public()
  @Get('courses/:id/ratings')
  forCourse(@Param('id') courseId: string) {
    return this.ratings.forCourse(courseId);
  }

  // Student
  @Get('student/courses/:id/rating-access')
  hasAccess(@CurrentPrincipal() p: Principal, @Param('id') courseId: string) {
    return this.ratings.hasAccess(p, courseId).then((hasAccess) => ({ hasAccess }));
  }

  @Post('courses/:id/ratings')
  submit(@CurrentPrincipal() p: Principal, @Param('id') courseId: string, @Body(new ZodValidationPipe(submitRatingSchema)) body: SubmitRating) {
    return this.ratings.submit(p, courseId, body);
  }

  @Post('courses/:id/ratings/:ratingId/report')
  report(@CurrentPrincipal() p: Principal, @Param('ratingId') ratingId: string) {
    return this.ratings.report(p, ratingId);
  }

  // Staff (support.manage)
  @Get('admin/ratings/queue')
  @RequirePermission('support.manage')
  queue(@CurrentPrincipal() p: Principal) {
    return this.ratings.queue(p);
  }

  @Patch('admin/ratings/:id')
  @RequirePermission('support.manage')
  moderate(@CurrentPrincipal() p: Principal, @Param('id') id: string, @Body(new ZodValidationPipe(moderateRatingSchema)) body: ModerateRating) {
    return this.ratings.moderate(p, id, body.action);
  }
}
