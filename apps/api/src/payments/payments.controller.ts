import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { Principal } from '@rajyarank/auth';
import { createOrderSchema, verifyPaymentSchema, type CreateOrder, type VerifyPayment } from '@rajyarank/contracts';
import { Public } from '../common/decorators/public.decorator';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AppError } from '../common/errors/app-error';
import { PaymentsService } from './payments.service';
import { EntitlementService } from './entitlement.service';

@Controller()
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly entitlements: EntitlementService,
  ) {}

  @Public()
  @Get('products')
  products() {
    return this.payments.listProducts();
  }

  @Post('orders')
  createOrder(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(createOrderSchema)) body: CreateOrder,
  ) {
    return this.payments.createOrder(p, body);
  }

  @Post('payments/razorpay/verify')
  verify(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(verifyPaymentSchema)) body: VerifyPayment,
  ) {
    return this.payments.verify(p, body);
  }

  @Get('student/orders')
  myOrders(@CurrentPrincipal() p: Principal) {
    return this.payments.listMyOrders(p);
  }

  @Get('student/orders/:id/receipt')
  async myReceipt(@CurrentPrincipal() p: Principal, @Param('id') id: string, @Res() res: Response) {
    const order = await this.payments.getOrderForReceipt(id);
    if (order.userId !== p.userId) throw AppError.permissionDenied('You may only download your own receipts.');
    const pdf = await this.payments.renderReceiptPdf(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${order.id.slice(0, 8)}.pdf"`);
    res.send(pdf);
  }

  @Get('student/entitlements')
  myEntitlements(@CurrentPrincipal() p: Principal) {
    return this.entitlements.listMine(p.userId);
  }
}
