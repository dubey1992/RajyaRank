import { Body, Controller, Get, Param, Patch, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { Principal } from '@rajyarank/auth';
import {
  upsertSubscriptionPlanSchema,
  subscribeOrganizationSchema,
  setTrialEndSchema,
  type UpsertSubscriptionPlan,
  type SubscribeOrganization,
  type SetTrialEnd,
} from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { BillingService } from './billing.service';

/** Institution → platform billing. Super Admin only (org.manage) — platform
 *  licensing is a platform-oversight concern, not an institution-scoped one. */
@Controller('admin/billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('plans')
  @RequirePermission('org.manage')
  listPlans() {
    return this.billing.listPlans();
  }

  @Post('plans')
  @RequirePermission('org.manage')
  createPlan(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(upsertSubscriptionPlanSchema)) body: UpsertSubscriptionPlan,
  ) {
    return this.billing.createPlan(principal, body);
  }

  @Patch('plans/:id')
  @RequirePermission('org.manage')
  updatePlan(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(upsertSubscriptionPlanSchema.partial())) body: Partial<UpsertSubscriptionPlan>,
  ) {
    return this.billing.updatePlan(principal, id, body);
  }

  @Get('subscriptions')
  @RequirePermission('org.manage')
  listSubscriptions() {
    return this.billing.listSubscriptions();
  }

  @Post('organizations/:orgId/subscribe')
  @RequirePermission('org.manage', { assurance: 'AAL2' })
  subscribeOrganization(
    @CurrentPrincipal() principal: Principal,
    @Param('orgId') orgId: string,
    @Body(new ZodValidationPipe(subscribeOrganizationSchema)) body: SubscribeOrganization,
  ) {
    return this.billing.subscribeOrganization(principal, orgId, body);
  }

  @Post('organizations/:orgId/cancel')
  @RequirePermission('org.manage', { assurance: 'AAL2' })
  cancelSubscription(@CurrentPrincipal() principal: Principal, @Param('orgId') orgId: string) {
    return this.billing.cancelSubscription(principal, orgId);
  }

  @Post('organizations/:orgId/trial/set-end')
  @RequirePermission('org.manage', { assurance: 'AAL2' })
  setTrialEnd(
    @CurrentPrincipal() principal: Principal,
    @Param('orgId') orgId: string,
    @Body(new ZodValidationPipe(setTrialEndSchema)) body: SetTrialEnd,
  ) {
    // Runs through the entire selected day, matching how "Period ends" is
    // shown/read elsewhere as a date, not a timestamp.
    const newEndDate = new Date(`${body.newEndDate}T23:59:59.999Z`);
    return this.billing.setTrialEnd(principal, orgId, newEndDate);
  }

  @Post('organizations/:orgId/trial/end')
  @RequirePermission('org.manage', { assurance: 'AAL2' })
  endTrialNow(@CurrentPrincipal() principal: Principal, @Param('orgId') orgId: string) {
    return this.billing.endTrialNow(principal, orgId);
  }

  @Get('invoices')
  @RequirePermission('org.manage')
  listInvoices() {
    return this.billing.listInvoices();
  }

  @Get('invoices/:id/pdf')
  @RequirePermission('org.manage')
  async invoicePdf(@Param('id') id: string, @Res() res: Response) {
    const { invoice, pdf } = await this.billing.renderInvoicePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    res.send(pdf);
  }

  @Post('invoices/:id/send')
  @RequirePermission('org.manage')
  sendInvoice(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.billing.sendInvoiceEmail(principal, id);
  }
}
