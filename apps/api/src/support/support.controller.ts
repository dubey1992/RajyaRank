import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { createTicketSchema, ticketReplySchema, ticketStatusSchema, type CreateTicket } from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { AllowSuspendedOrg } from '../common/decorators/allow-suspended-org.decorator';
import { SupportService } from './support.service';

@Controller()
export class SupportController {
  constructor(private readonly support: SupportService) {}

  // Student — exempted from the institution-suspended lockout: a student
  // detached by their own institute's suspension still needs a way to reach
  // RajyaRank support, not just a dead end.
  @AllowSuspendedOrg()
  @Post('student/support-tickets')
  create(@CurrentPrincipal() p: Principal, @Body(new ZodValidationPipe(createTicketSchema)) body: CreateTicket) {
    return this.support.create(p, body);
  }

  @AllowSuspendedOrg()
  @Get('student/support-tickets')
  mine(@CurrentPrincipal() p: Principal) {
    return this.support.listMine(p);
  }

  @AllowSuspendedOrg()
  @Post('student/support-tickets/:id/replies')
  studentReply(@CurrentPrincipal() p: Principal, @Param('id') id: string, @Body(new ZodValidationPipe(ticketReplySchema)) body: { bodyText: string }) {
    return this.support.ownerReply(p, id, body.bodyText);
  }

  // Institution staff raising their own ticket (e.g. an Academic Head
  // reaching support while their institution is suspended) — distinct from
  // the support.manage queue below, which is RajyaRank's own support team
  // managing everyone's tickets. Exempted from the suspended-org lockout
  // for the same reason the student routes above are.
  @AllowSuspendedOrg()
  @Post('staff/my-support-tickets')
  staffCreate(@CurrentPrincipal() p: Principal, @Body(new ZodValidationPipe(createTicketSchema)) body: CreateTicket) {
    return this.support.create(p, body);
  }

  @AllowSuspendedOrg()
  @Get('staff/my-support-tickets')
  staffMine(@CurrentPrincipal() p: Principal) {
    return this.support.listMine(p);
  }

  @AllowSuspendedOrg()
  @Post('staff/my-support-tickets/:id/replies')
  staffOwnerReply(@CurrentPrincipal() p: Principal, @Param('id') id: string, @Body(new ZodValidationPipe(ticketReplySchema)) body: { bodyText: string }) {
    return this.support.ownerReply(p, id, body.bodyText);
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
