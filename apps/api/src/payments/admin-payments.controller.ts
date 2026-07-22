import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { Principal } from '@rajyarank/auth';
import { grantEntitlementSchema, refundSchema, rejectRefundSchema, type RejectRefund } from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { PaymentsService } from './payments.service';
import { EntitlementService } from './entitlement.service';

@Controller('admin')
export class AdminPaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly entitlements: EntitlementService,
  ) {}

  @Get('payments/orders')
  @RequirePermission('payment.manage')
  orders(@Query('orgId') orgId?: string) {
    return this.payments.adminListOrders(orgId);
  }

  @Get('payments/orders/:id/receipt')
  @RequirePermission('payment.manage')
  async receipt(@Param('id') id: string, @Res() res: Response) {
    const order = await this.payments.getOrderForReceipt(id);
    const pdf = await this.payments.renderReceiptPdf(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${order.id.slice(0, 8)}.pdf"`);
    res.send(pdf);
  }

  @Post('entitlements/grant')
  @RequirePermission('payment.manage', { assurance: 'AAL2' })
  grant(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(grantEntitlementSchema))
    body: { userId: string; productId: string; source: 'ADMIN' | 'SCHOLARSHIP' | 'PROMOTION'; reason?: string; endsAt?: string },
  ) {
    return this.entitlements.grantManual(p, body);
  }

  @Post('entitlements/:id/revoke')
  @RequirePermission('payment.manage', { assurance: 'AAL2' })
  revoke(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.entitlements.revoke(p, id);
  }

  @Post('refunds')
  @RequirePermission('payment.manage', { assurance: 'AAL2' })
  refund(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(refundSchema)) body: { paymentId: string; amountMinor?: number; reason?: string },
  ) {
    return this.payments.refund(p, body);
  }

  @Get('refunds/pending')
  @RequirePermission('payment.manage')
  pendingRefunds() {
    return this.payments.listPendingRefundApprovals();
  }

  @Post('refunds/:id/approve')
  @RequirePermission('payment.manage', { assurance: 'AAL2' })
  approveRefund(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.payments.approveRefund(p, id);
  }

  @Post('refunds/:id/reject')
  @RequirePermission('payment.manage', { assurance: 'AAL2' })
  rejectRefund(
    @CurrentPrincipal() p: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectRefundSchema)) body: RejectRefund,
  ) {
    return this.payments.rejectRefund(p, id, body.reason);
  }
}
