import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { createTicketSchema, ticketReplySchema, ticketStatusSchema, type CreateTicket } from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { SupportService } from './support.service';

@Controller()
export class SupportController {
  constructor(private readonly support: SupportService) {}

  // Student
  @Post('student/support-tickets')
  create(@CurrentPrincipal() p: Principal, @Body(new ZodValidationPipe(createTicketSchema)) body: CreateTicket) {
    return this.support.create(p, body);
  }

  @Get('student/support-tickets')
  mine(@CurrentPrincipal() p: Principal) {
    return this.support.listMine(p);
  }

  @Post('student/support-tickets/:id/replies')
  studentReply(@CurrentPrincipal() p: Principal, @Param('id') id: string, @Body(new ZodValidationPipe(ticketReplySchema)) body: { bodyText: string }) {
    return this.support.studentReply(p, id, body.bodyText);
  }

  // Staff (support.manage)
  @Get('staff/support-tickets')
  @RequirePermission('support.manage')
  staffList(@CurrentPrincipal() p: Principal, @Query('status') status?: string) {
    return this.support.staffList(p, status);
  }

  @Post('staff/support-tickets/:id/replies')
  @RequirePermission('support.manage')
  staffReply(
    @CurrentPrincipal() p: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ticketReplySchema)) body: { bodyText: string; internal?: boolean },
  ) {
    return this.support.staffReply(p, id, body.bodyText, body.internal ?? false);
  }

  @Patch('staff/support-tickets/:id/status')
  @RequirePermission('support.manage')
  setStatus(
    @CurrentPrincipal() p: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ticketStatusSchema)) body: { status: string },
  ) {
    return this.support.setStatus(p, id, body.status);
  }
}
