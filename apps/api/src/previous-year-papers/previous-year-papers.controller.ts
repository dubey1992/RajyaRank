import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { createPyqPaperSchema, type CreatePyqPaper } from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { PreviousYearPapersService } from './previous-year-papers.service';

@Controller('staff/pyq-papers')
export class PreviousYearPapersController {
  constructor(private readonly service: PreviousYearPapersService) {}

  @Get()
  @RequirePermission('content.create')
  list(@CurrentPrincipal() p: Principal) {
    return this.service.list(p);
  }

  @Post()
  @RequirePermission('content.create')
  create(@CurrentPrincipal() p: Principal, @Body(new ZodValidationPipe(createPyqPaperSchema)) dto: CreatePyqPaper) {
    return this.service.create(p, dto);
  }

  @Post(':id/submit')
  @RequirePermission('content.submit_review')
  submit(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.service.submit(p, id);
  }

  @Post(':id/start-review')
  @RequirePermission('content.review')
  startReview(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.service.startReview(p, id);
  }

  @Post(':id/approve')
  @RequirePermission('content.approve')
  approve(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.service.approve(p, id);
  }

  @Post(':id/publish')
  @RequirePermission('content.publish')
  publish(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.service.publish(p, id);
  }
}

@Controller('student/pyq-papers')
export class StudentPyqPapersController {
  constructor(private readonly service: PreviousYearPapersService) {}

  @Get()
  list(@CurrentPrincipal() p: Principal) {
    return this.service.listForStudent(p);
  }

  @Get(':id/download')
  download(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.service.downloadForStudent(p, id);
  }
}
