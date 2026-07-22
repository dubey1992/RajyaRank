import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { assignDoubtSchema, createDoubtSchema, doubtReplySchema, type CreateDoubt, type DoubtReplyInput } from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { DoubtsService } from './doubts.service';

@Controller()
export class DoubtsController {
  constructor(private readonly doubts: DoubtsService) {}

  // Student
  @Post('student/doubts')
  create(@CurrentPrincipal() p: Principal, @Body(new ZodValidationPipe(createDoubtSchema)) body: CreateDoubt) {
    return this.doubts.create(p, body);
  }

  @Get('student/doubts')
  mine(@CurrentPrincipal() p: Principal) {
    return this.doubts.listMine(p);
  }

  @Post('student/doubts/:id/reopen')
  reopen(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.doubts.reopen(p, id);
  }

  // Staff (doubt.respond)
  @Get('staff/doubts')
  @RequirePermission('doubt.respond')
  queue(@CurrentPrincipal() p: Principal) {
    return this.doubts.staffQueue(p);
  }

  @Post('staff/doubts/:id/assign')
  @RequirePermission('doubt.respond')
  assign(@CurrentPrincipal() p: Principal, @Param('id') id: string, @Body(new ZodValidationPipe(assignDoubtSchema)) body: { assignedToUserId: string }) {
    return this.doubts.assign(p, id, body.assignedToUserId);
  }

  @Post('staff/doubts/:id/replies')
  @RequirePermission('doubt.respond')
  reply(@CurrentPrincipal() p: Principal, @Param('id') id: string, @Body(new ZodValidationPipe(doubtReplySchema)) body: DoubtReplyInput) {
    return this.doubts.reply(p, id, body);
  }

  @Post('staff/doubts/:id/resolve')
  @RequirePermission('doubt.respond')
  resolve(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.doubts.resolve(p, id);
  }
}
