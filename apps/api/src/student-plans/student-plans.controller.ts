import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { upsertStudentPlanSchema, type UpsertStudentPlan } from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { StudentPlansService } from './student-plans.service';

/** Student subscription plan catalog. Gated `payment.manage` — already
 *  Super-Admin-exclusive for writes (see packages/auth/permissions.ts) — not
 *  `course.manage`, which Content Admins/Institution Heads also hold and
 *  would let them set platform-wide pricing, which is exactly what this must
 *  not allow. Mirrors billing.controller.ts's institution-plan CRUD, which is
 *  the closest existing precedent (also Super-Admin-only pricing writes). */
@Controller('admin/student-plans')
export class StudentPlansController {
  constructor(private readonly plans: StudentPlansService) {}

  @Get()
  @RequirePermission('payment.manage')
  list() {
    return this.plans.list();
  }

  @Post()
  @RequirePermission('payment.manage')
  create(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(upsertStudentPlanSchema)) body: UpsertStudentPlan,
  ) {
    return this.plans.create(principal, body);
  }

  @Patch(':id')
  @RequirePermission('payment.manage')
  update(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(upsertStudentPlanSchema.partial())) body: Partial<UpsertStudentPlan>,
  ) {
    return this.plans.update(principal, id, body);
  }
}
