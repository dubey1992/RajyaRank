import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import {
  createBatchSchema,
  createChapterSchema,
  createCourseSchema,
  createLessonSchema,
  createSubjectSchema,
  createTopicSchema,
  updateCourseSchema,
  updateSequenceSchema,
  type CreateBatch,
  type CreateCourse,
  type CreateLesson,
  type UpdateCourse,
} from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { CoursesService } from './courses.service';

@Controller('admin/courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  @RequirePermission('course.manage')
  list(@CurrentPrincipal() principal: Principal) {
    return this.courses.listCourses(principal);
  }

  @Get(':id')
  @RequirePermission('course.manage')
  detail(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.courses.courseDetail(principal, id);
  }

  @Get(':id/readiness')
  @RequirePermission('course.manage')
  readiness(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.courses.readiness(principal, id);
  }

  @Post(':id/preview-token')
  @RequirePermission('course.manage')
  previewToken(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.courses.createPreviewToken(principal, id);
  }

  @Delete(':id')
  @RequirePermission('course.manage')
  removeCourse(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.courses.deleteCourse(principal, id);
  }

  @Delete('subjects/:id')
  @RequirePermission('course.manage')
  removeSubject(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.courses.deleteSubject(principal, id);
  }

  @Delete('chapters/:id')
  @RequirePermission('course.manage')
  removeChapter(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.courses.deleteChapter(principal, id);
  }

  @Delete('topics/:id')
  @RequirePermission('course.manage')
  removeTopic(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.courses.deleteTopic(principal, id);
  }

  @Delete('lessons/:id')
  @RequirePermission('course.manage')
  removeLesson(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.courses.deleteLesson(principal, id);
  }

  @Post()
  @RequirePermission('course.manage')
  create(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(createCourseSchema)) body: CreateCourse,
  ) {
    return this.courses.createCourse(principal, body);
  }

  @Patch(':id')
  @RequirePermission('course.manage')
  update(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCourseSchema)) body: UpdateCourse,
  ) {
    return this.courses.updateCourse(principal, id, body);
  }

  @Post(':id/batches')
  @RequirePermission('course.manage')
  addBatch(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createBatchSchema)) body: CreateBatch,
  ) {
    return this.courses.addBatch(principal, id, body);
  }

  @Post(':id/subjects')
  @RequirePermission('course.manage')
  addSubject(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createSubjectSchema)) body: { nameHi: string; nameEn: string; sequence: number },
  ) {
    return this.courses.addSubject(principal, id, body);
  }

  @Post('subjects/:subjectId/chapters')
  @RequirePermission('course.manage')
  addChapter(
    @CurrentPrincipal() principal: Principal,
    @Param('subjectId') subjectId: string,
    @Body(new ZodValidationPipe(createChapterSchema)) body: { nameHi: string; nameEn: string; sequence: number },
  ) {
    return this.courses.addChapter(principal, subjectId, body);
  }

  @Post('chapters/:chapterId/topics')
  @RequirePermission('course.manage')
  addTopic(
    @CurrentPrincipal() principal: Principal,
    @Param('chapterId') chapterId: string,
    @Body(new ZodValidationPipe(createTopicSchema)) body: { nameHi: string; nameEn: string; sequence: number },
  ) {
    return this.courses.addTopic(principal, chapterId, body);
  }

  @Patch('subjects/:id')
  @RequirePermission('course.manage')
  updateSubject(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSequenceSchema)) body: { sequence: number },
  ) {
    return this.courses.updateSubject(principal, id, body);
  }

  @Patch('chapters/:id')
  @RequirePermission('course.manage')
  updateChapter(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSequenceSchema)) body: { sequence: number },
  ) {
    return this.courses.updateChapter(principal, id, body);
  }

  @Patch('topics/:id')
  @RequirePermission('course.manage')
  updateTopic(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSequenceSchema)) body: { sequence: number },
  ) {
    return this.courses.updateTopic(principal, id, body);
  }

  @Post('topics/:topicId/lessons')
  @RequirePermission('course.manage')
  addLesson(
    @CurrentPrincipal() principal: Principal,
    @Param('topicId') topicId: string,
    @Body(new ZodValidationPipe(createLessonSchema)) body: CreateLesson,
  ) {
    return this.courses.addLesson(principal, topicId, body);
  }
}
