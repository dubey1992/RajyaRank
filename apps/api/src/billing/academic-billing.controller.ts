import { Body, Controller, Get, Post } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { subscribeOrganizationSchema, confirmSelfServePaymentSchema, type SubscribeOrganization, type ConfirmSelfServePayment } from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { BillingService } from './billing.service';

/** Academic Head: self-serve subscription purchase/renewal for their own
 *  institution — org-scope enforced inside the service via principal.orgId,
 *  same pattern as SettlementsAcademicController. course.manage is the
 *  Head-held permission this mirrors (org.manage stays Super-Admin-only).
 *
 *  Every route here bypasses the subscription gate: this controller IS how a
 *  Head escapes an inactive/never-purchased subscription, so gating it
 *  behind an active one is circular — it would only ever be reachable by
 *  orgs that don't need it. */
@Controller('academic/billing')
export class AcademicBillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('plans')
  @RequirePermission('course.manage', { bypassSubscriptionGate: true })
  listPlans() {
    return this.billing.listActivePlans();
  }

  @Get('subscription')
  @RequirePermission('course.manage', { bypassSubscriptionGate: true })
  mySubscription(@CurrentPrincipal() principal: Principal) {
    return this.billing.getMySubscription(principal);
  }

  @Post('subscribe')
  @RequirePermission('course.manage', { assurance: 'AAL2', bypassSubscriptionGate: true })
  subscribe(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(subscribeOrganizationSchema)) body: SubscribeOrganization,
  ) {
    return this.billing.selfServeSubscribe(principal, body);
  }

  /** Confirms the Razorpay Checkout payment that just happened in-page —
   *  no AAL2 here, same as the student payments/razorpay/verify endpoint:
   *  confirming a payment already authorized isn't itself a sensitive
   *  state-change requiring step-up. */
  @Post('subscribe/verify')
  @RequirePermission('course.manage', { bypassSubscriptionGate: true })
  verify(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(confirmSelfServePaymentSchema)) body: ConfirmSelfServePayment,
  ) {
    return this.billing.confirmSelfServePayment(principal, body);
  }
}
