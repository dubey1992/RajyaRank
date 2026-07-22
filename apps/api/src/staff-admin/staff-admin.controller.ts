import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import {
  patchStaffStatusSchema,
  setAssignmentsSchema,
  updateRolePermissionsSchema,
  type AssignmentInput,
  type UpdateRolePermissions,
} from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { StaffAdminService } from './staff-admin.service';

@Controller('admin')
export class StaffAdminController {
  constructor(private readonly staff: StaffAdminService) {}

  @Get('staff')
  @RequirePermission('user.manage')
  list(@CurrentPrincipal() principal: Principal, @Query('search') search?: string) {
    return this.staff.list(principal, search);
  }

  @Get('staff/:id')
  @RequirePermission('user.manage')
  getOne(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.staff.getOne(principal, id);
  }

  @Patch('staff/:id/status')
  @RequirePermission('user.disable', { assurance: 'AAL2' })
  patchStatus(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(patchStaffStatusSchema))
    body: { status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED'; reason?: string },
  ) {
    return this.staff.patchStatus(principal, id, body.status, body.reason);
  }

  @Post('staff/:id/assignments')
  @RequirePermission('assignment.manage', { assurance: 'AAL2' })
  setAssignments(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setAssignmentsSchema)) body: { assignments: AssignmentInput[] },
  ) {
    return this.staff.setAssignments(principal, id, body.assignments);
  }

  @Post('staff/:id/force-password-reset')
  @RequirePermission('user.manage')
  forcePasswordReset(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.staff.forcePasswordReset(principal, id);
  }

  @Post('staff/:id/revoke-sessions')
  @RequirePermission('user.manage')
  revokeSessions(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.staff.revokeSessions(principal, id);
  }

  @Get('roles')
  @RequirePermission('role.manage')
  roles() {
    return this.staff.roles();
  }

  @Get('permissions')
  @RequirePermission('role.manage')
  permissions() {
    return this.staff.permissions();
  }

  @Patch('roles/:id/permissions')
  @RequirePermission('role.manage', { assurance: 'AAL2' })
  updateRolePermissions(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRolePermissionsSchema)) body: UpdateRolePermissions,
  ) {
    return this.staff.updateRolePermissions(principal, id, body.permissionCodes);
  }

  @Get('audit-events')
  @RequirePermission('audit.view')
  audit(@Query('action') action?: string, @Query('orgId') orgId?: string) {
    return this.staff.auditEvents(action, orgId);
  }
}
