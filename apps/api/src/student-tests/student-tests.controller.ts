import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { saveAnswerSchema, type SaveAnswer } from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { StudentTestsService } from './student-tests.service';

@Controller('student')
export class StudentTestsController {
  constructor(private readonly tests: StudentTestsService) {}

  @Get('tests')
  list(@CurrentPrincipal() p: Principal) {
    return this.tests.listTests(p);
  }

  @Post('tests/:testVersionId/attempts')
  start(@CurrentPrincipal() p: Principal, @Param('testVersionId') id: string) {
    return this.tests.startAttempt(p, id);
  }

  @Put('attempts/:attemptId/answers/:questionVersionId')
  save(
    @CurrentPrincipal() p: Principal,
    @Param('attemptId') attemptId: string,
    @Param('questionVersionId') questionVersionId: string,
    @Body(new ZodValidationPipe(saveAnswerSchema)) body: SaveAnswer,
  ) {
    return this.tests.saveAnswer(p, attemptId, questionVersionId, body);
  }

  @Post('attempts/:attemptId/submit')
  submit(@CurrentPrincipal() p: Principal, @Param('attemptId') attemptId: string) {
    return this.tests.submit(p, attemptId);
  }

  @Get('attempts/:attemptId/result')
  result(@CurrentPrincipal() p: Principal, @Param('attemptId') attemptId: string) {
    return this.tests.result(p, attemptId);
  }
}
