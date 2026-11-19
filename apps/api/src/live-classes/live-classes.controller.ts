import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import {
  createLiveClassSchema,
  updateLiveClassSchema,
  publishLiveClassAsLessonSchema,
  type CreateLiveClassInput,
  type UpdateLiveClassInput,
  type PublishLiveClassAsLessonInput,
} from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { LiveClassesService } from './live-classes.service';

/** Staff administration — org-scoped exactly like every other course.manage
 *  endpoint (CoursesController). A Content Admin/Academic Head only manages
 *  live classes for courses within their own assigned scope. */
@Controller('admin/live-classes')
export class LiveClassesController {
  constructor(private readonly liveClasses: LiveClassesService) {}

  @Post()
  @RequirePermission('course.manage')
  create(@CurrentPrincipal() principal: Principal, @Body(new ZodValidationPipe(createLiveClassSchema)) dto: CreateLiveClassInput) {
    return this.liveClasses.create(principal, dto);
  }

  @Get()
  @RequirePermission('course.manage')
  list(@CurrentPrincipal() principal: Principal, @Query('courseId') courseId: string) {
    return this.liveClasses.list(principal, courseId);
  }

  @Patch(':id')
  @RequirePermission('course.manage')
  update(@CurrentPrincipal() principal: Principal, @Param('id') id: string, @Body(new ZodValidationPipe(updateLiveClassSchema)) dto: UpdateLiveClassInput) {
    return this.liveClasses.update(principal, id, dto);
  }

  @Post(':id/cancel')
  @RequirePermission('course.manage')
  cancel(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.liveClasses.cancel(principal, id);
  }

  @Get(':id/attendance')
  @RequirePermission('course.manage')
  attendance(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.liveClasses.attendance(principal, id);
  }

  @Post(':id/publish-as-lesson')
  @RequirePermission('course.manage')
  publishAsLesson(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(publishLiveClassAsLessonSchema)) dto: PublishLiveClassAsLessonInput,
  ) {
    return this.liveClasses.publishAsLesson(principal, id, dto);
  }
}

/** Student-facing — entitlement-checked inline, same pattern as lesson
 *  playback-token issuance (StudentController#playbackToken). */
@Controller('student/live-classes')
export class StudentLiveClassesController {
  constructor(private readonly liveClasses: LiveClassesService) {}

  @Get('upcoming')
  upcoming(@CurrentPrincipal() principal: Principal) {
    return this.liveClasses.upcoming(principal);
  }

  @Post(':id/join')
  join(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.liveClasses.join(principal, id);
  }
}
