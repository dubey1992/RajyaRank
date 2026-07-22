import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import {
  addSectionSchema,
  addTestQuestionSchema,
  createTestSchema,
  quickCreateQuizSchema,
  rejectTestSchema,
  type CreateTest,
  type QuickCreateQuiz,
  type RejectTest,
} from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { TestBuilderService } from './test-builder.service';

@Controller('staff/tests')
export class TestBuilderController {
  constructor(private readonly tb: TestBuilderService) {}

  // No @RequirePermission here — a pure Academic Reviewer holds content.approve
  // but not test.create, and still needs to see this list to know what to
  // review. See TestBuilderService.list()'s own authorizeAny() check.
  @Get()
  list(@CurrentPrincipal() p: Principal) {
    return this.tb.list(p);
  }

  @Post()
  @RequirePermission('test.create')
  create(@CurrentPrincipal() p: Principal, @Body(new ZodValidationPipe(createTestSchema)) body: CreateTest) {
    return this.tb.createTest(p, body);
  }

  // No @RequirePermission — a pure Academic Reviewer needs to inspect a
  // test's questions before approving; see TestBuilderService.detail()'s
  // own authorizeAny() check (same visibility as list()).
  @Get('versions/:id/detail')
  detail(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.tb.detail(p, id);
  }

  @Post('quick-create')
  @RequirePermission('test.create')
  quickCreate(@CurrentPrincipal() p: Principal, @Body(new ZodValidationPipe(quickCreateQuizSchema)) body: QuickCreateQuiz) {
    return this.tb.quickCreate(p, body);
  }

  @Post('versions/:id/sections')
  @RequirePermission('test.create')
  addSection(
    @CurrentPrincipal() p: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addSectionSchema)) body: { nameHi: string; nameEn: string; sequence: number },
  ) {
    return this.tb.addSection(p, id, body);
  }

  @Post('sections/:sectionId/questions')
  @RequirePermission('test.create')
  addQuestion(
    @CurrentPrincipal() p: Principal,
    @Param('sectionId') sectionId: string,
    @Body(new ZodValidationPipe(addTestQuestionSchema))
    body: { questionVersionId: string; sequence: number; marks?: number; negativeMarks?: number },
  ) {
    return this.tb.addQuestion(p, sectionId, body);
  }

  @Post('versions/:id/submit')
  @RequirePermission('test.create')
  submit(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.tb.submit(p, id);
  }

  @Post('versions/:id/approve')
  @RequirePermission('content.approve')
  approve(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.tb.approve(p, id);
  }

  @Post('versions/:id/reject')
  @RequirePermission('content.approve')
  reject(
    @CurrentPrincipal() p: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectTestSchema)) body: RejectTest,
  ) {
    return this.tb.reject(p, id, body.reason);
  }

  @Post('versions/:id/publish')
  @RequirePermission('content.publish', { assurance: 'AAL2' })
  publish(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.tb.publish(p, id);
  }
}
