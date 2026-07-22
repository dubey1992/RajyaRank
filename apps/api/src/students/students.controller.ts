import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { enrollStudentSchema, patchStaffStatusSchema, type EnrollStudent } from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { StudentsService } from './students.service';

@Controller('admin/students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  @RequirePermission('user.manage')
  list(@CurrentPrincipal() principal: Principal, @Query('search') search?: string) {
    return this.students.list(principal, search);
  }

  @Post()
  @RequirePermission('user.manage')
  enroll(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(enrollStudentSchema)) body: EnrollStudent,
  ) {
    return this.students.enroll(principal, body);
  }

  @Patch(':id/status')
  @RequirePermission('user.disable', { assurance: 'AAL2' })
  patchStatus(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(patchStaffStatusSchema))
    body: { status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED'; reason?: string },
  ) {
    return this.students.patchStatus(principal, id, body.status, body.reason);
  }

  @Post(':id/force-password-reset')
  @RequirePermission('user.manage')
  forcePasswordReset(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.students.forcePasswordReset(principal, id);
  }

  @Post(':id/revoke-sessions')
  @RequirePermission('user.manage')
  revokeSessions(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.students.revokeSessions(principal, id);
  }
}
