import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { upsertConceptSchema, type UpsertConcept } from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { ConceptsService } from './concepts.service';

/** Concept-graph authoring — gated `course.manage` (Content Admin + Academic
 *  Head), the same gate every other curriculum-authoring endpoint uses. */
@Controller('admin/concepts')
export class ConceptsController {
  constructor(private readonly concepts: ConceptsService) {}

  @Get()
  @RequirePermission('course.manage')
  list(@Query('examId') examId: string) {
    return this.concepts.list(examId);
  }

  @Post()
  @RequirePermission('course.manage')
  create(@CurrentPrincipal() p: Principal, @Body(new ZodValidationPipe(upsertConceptSchema)) body: UpsertConcept) {
    return this.concepts.create(p, body);
  }

  @Patch(':id')
  @RequirePermission('course.manage')
  update(
    @CurrentPrincipal() p: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(upsertConceptSchema.partial())) body: Partial<UpsertConcept>,
  ) {
    return this.concepts.update(p, id, body);
  }

  @Delete(':id')
  @RequirePermission('course.manage')
  remove(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.concepts.remove(p, id);
  }

  @Get(':id/lessons')
  @RequirePermission('course.manage')
  listLessons(@Param('id') id: string) {
    return this.concepts.listLessonLinks(id);
  }

  @Get(':id/questions')
  @RequirePermission('course.manage')
  listQuestions(@Param('id') id: string) {
    return this.concepts.listQuestionLinks(id);
  }

  @Post(':id/lessons/:lessonId')
  @RequirePermission('course.manage')
  attachLesson(@CurrentPrincipal() p: Principal, @Param('id') id: string, @Param('lessonId') lessonId: string) {
    return this.concepts.attachLesson(p, id, lessonId);
  }

  @Delete(':id/lessons/:lessonId')
  @RequirePermission('course.manage')
  detachLesson(@CurrentPrincipal() p: Principal, @Param('id') id: string, @Param('lessonId') lessonId: string) {
    return this.concepts.detachLesson(p, id, lessonId);
  }

  @Post(':id/questions/:questionId')
  @RequirePermission('course.manage')
  attachQuestion(@CurrentPrincipal() p: Principal, @Param('id') id: string, @Param('questionId') questionId: string) {
    return this.concepts.attachQuestion(p, id, questionId);
  }

  @Delete(':id/questions/:questionId')
  @RequirePermission('course.manage')
  detachQuestion(@CurrentPrincipal() p: Principal, @Param('id') id: string, @Param('questionId') questionId: string) {
    return this.concepts.detachQuestion(p, id, questionId);
  }
}
