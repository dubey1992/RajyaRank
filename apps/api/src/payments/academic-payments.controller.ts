import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { Principal } from '@rajyarank/auth';
import { refundSchema } from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { AppError } from '../common/errors/app-error';
import { PaymentsService } from './payments.service';

/** Academic Head's "Student Payments" ledger — org-scoped via principal.orgId,
 *  never a client-supplied org id. Explicitly role-restricted to ACADEMIC_HEAD
 *  (see the `roles` option on RequirePermission): course.manage alone isn't
 *  enough, since Content Admin holds it too for legitimate course-management
 *  reasons and has no business seeing institution payment data. */
@Controller('academic')
export class AcademicPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('orders')
  @RequirePermission('course.manage', { roles: ['ACADEMIC_HEAD'] })
  orders(@CurrentPrincipal() p: Principal) {
    if (!p.orgId) throw AppError.permissionDenied('No institution assigned.');
    return this.payments.academicListOrders(p.orgId);
  }

  @Get('orders/:id/receipt')
  @RequirePermission('course.manage', { roles: ['ACADEMIC_HEAD'] })
  async receipt(@CurrentPrincipal() p: Principal, @Param('id') id: string, @Res() res: Response) {
    if (!p.orgId) throw AppError.permissionDenied('No institution assigned.');
    const order = await this.payments.getOrderForReceipt(id);
    if (order.product.course?.orgId !== p.orgId) throw AppError.permissionDenied('This order is not part of your institution.');
    const pdf = await this.payments.renderReceiptPdf(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${order.id.slice(0, 8)}.pdf"`);
    res.send(pdf);
  }

  @Post('refunds')
  @RequirePermission('course.manage', { roles: ['ACADEMIC_HEAD'] })
  requestRefund(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(refundSchema)) body: { paymentId: string; amountMinor?: number; reason?: string },
  ) {
    return this.payments.requestRefund(p, body);
  }
}
