import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { Principal } from '@rajyarank/auth';
import { acceptInvitationSchema, createInvitationSchema, type CreateInvitation } from '@rajyarank/contracts';
import { Public } from '../common/decorators/public.decorator';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { InvitationsService } from './invitations.service';

@Controller()
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post('admin/staff/invitations')
  @RequirePermission('user.invite')
  async create(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(createInvitationSchema)) body: CreateInvitation,
    @Req() req: Request,
  ) {
    return this.invitations.create(principal, body, { ip: req.ip, ua: req.header('user-agent') ?? undefined });
  }

  @Public()
  @Get('staff/invitations/:token')
  async preview(@Param('token') token: string) {
    return this.invitations.preview(token);
  }

  @Public()
  @Post('staff/invitations/:token/accept')
  async accept(
    @Param('token') token: string,
    @Body(new ZodValidationPipe(acceptInvitationSchema.pick({ password: true })))
    body: { password: string },
  ) {
    return this.invitations.accept({ token, password: body.password });
  }

  @Post('admin/staff/invitations/:id/resend')
  @RequirePermission('user.invite')
  async resend(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.invitations.resend(principal, id);
  }

  @Post('admin/staff/invitations/:id/revoke')
  @RequirePermission('user.invite')
  async revoke(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.invitations.revoke(principal, id);
  }
}
