import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { Principal } from '@rajyarank/auth';
import {
  registerOrganizationSchema,
  inviteHeadSchema,
  orgStatusSchema,
  adminSetInvitePasswordSchema,
  type RegisterOrganization,
  type InviteHead,
  type OrgStatusUpdate,
  type AdminSetInvitePassword,
} from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { OrganizationsService } from './organizations.service';

@Controller('admin/organizations')
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  @Get()
  @RequirePermission('org.manage')
  list() {
    return this.orgs.list();
  }

  @Post()
  @RequirePermission('org.manage')
  register(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(registerOrganizationSchema)) body: RegisterOrganization,
    @Req() req: Request,
  ) {
    return this.orgs.register(principal, body, { ip: req.ip, ua: req.header('user-agent') ?? undefined });
  }

  @Post(':id/heads')
  @RequirePermission('org.manage')
  inviteHead(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(inviteHeadSchema)) body: InviteHead,
    @Req() req: Request,
  ) {
    return this.orgs.inviteHead(principal, id, body, { ip: req.ip, ua: req.header('user-agent') ?? undefined });
  }

  @Post(':id/heads/:invitationId/resend')
  @RequirePermission('org.manage')
  resendHeadInvite(@CurrentPrincipal() principal: Principal, @Param('id') id: string, @Param('invitationId') invitationId: string) {
    return this.orgs.resendHeadInvite(principal, id, invitationId);
  }

  @Post(':id/heads/:invitationId/set-password')
  @RequirePermission('org.manage')
  setHeadInvitePassword(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
    @Body(new ZodValidationPipe(adminSetInvitePasswordSchema)) body: AdminSetInvitePassword,
  ) {
    return this.orgs.setHeadInvitePassword(principal, id, invitationId, body.password);
  }

  @Patch(':id/status')
  @RequirePermission('org.manage')
  setStatus(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(orgStatusSchema)) body: OrgStatusUpdate,
  ) {
    return this.orgs.setStatus(principal, id, body.status);
  }

  @Post(':id/access-code')
  @RequirePermission('org.manage')
  regenerateAccessCode(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.orgs.regenerateAccessCode(principal, id);
  }

  @Delete(':id')
  @RequirePermission('org.manage')
  remove(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.orgs.remove(principal, id);
  }
}
