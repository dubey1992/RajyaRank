import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import {
  createQuestionSchema,
  importQuestionsSchema,
  type CreateQuestion,
} from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { QuestionBankService } from './question-bank.service';

@Controller('staff/questions')
export class QuestionBankController {
  constructor(private readonly qb: QuestionBankService) {}

  @Get()
  @RequirePermission('question.create')
  list(@CurrentPrincipal() p: Principal, @Query('subjectId') subjectId?: string) {
    return this.qb.list(p, subjectId);
  }

  @Post()
  @RequirePermission('question.create')
  create(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(createQuestionSchema)) body: CreateQuestion,
  ) {
    return this.qb.create(p, body);
  }

  @Post('import')
  @RequirePermission('question.import')
  import(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(importQuestionsSchema)) body: { rows: CreateQuestion[] },
  ) {
    return this.qb.import(p, body.rows);
  }

  @Post('versions/:id/submit')
  @RequirePermission('question.create')
  submit(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.qb.submit(p, id);
  }

  @Post('versions/:id/approve')
  @RequirePermission('content.approve')
  approve(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.qb.approve(p, id);
  }
}
