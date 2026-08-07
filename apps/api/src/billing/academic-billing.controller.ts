import { Body, Controller, Get, Post } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { subscribeOrganizationSchema, type SubscribeOrganization } from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { BillingService } from './billing.service';

/** Academic Head: self-serve subscription purchase/renewal for their own
 *  institution — org-scope enforced inside the service via principal.orgId,
 *  same pattern as SettlementsAcademicController. course.manage is the
 *  Head-held permission this mirrors (org.manage stays Super-Admin-only). */
@Controller('academic/billing')
export class AcademicBillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('plans')
  @RequirePermission('course.manage')
  listPlans() {
    return this.billing.listActivePlans();
  }

  @Get('subscription')
  @RequirePermission('course.manage')
  mySubscription(@CurrentPrincipal() principal: Principal) {
    return this.billing.getMySubscription(principal);
  }

  @Post('subscribe')
  @RequirePermission('course.manage', { assurance: 'AAL2' })
  subscribe(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(subscribeOrganizationSchema)) body: SubscribeOrganization,
  ) {
    return this.billing.selfServeSubscribe(principal, body);
  }
}
