import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Principal } from '@rajyarank/auth';
import { createOrderSchema, previewCouponSchema, verifyPaymentSchema, type CreateOrder, type PreviewCoupon, type VerifyPayment } from '@rajyarank/contracts';
import { Public } from '../common/decorators/public.decorator';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AppError } from '../common/errors/app-error';
import { PaymentsService, type ClientFbMeta } from './payments.service';
import { EntitlementService } from './entitlement.service';

@Controller()
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly entitlements: EntitlementService,
  ) {}

  /** Optional Meta Pixel browser identifiers — see ClientFbMeta. Absent on
   *  every other field when the caller never sent them (e.g. the web app's
   *  env has no Pixel configured, or an older client). */
  private fbMeta(req: Request): ClientFbMeta {
    // || not ?? — the client sends '' rather than omitting the header when
    // it has no fbp/fbc yet (Pixel not loaded), and an empty string should
    // be treated as absent, same as a missing header.
    return {
      eventId: req.header('x-fb-event-id') || undefined,
      fbp: req.header('x-fb-fbp') || undefined,
      fbc: req.header('x-fb-fbc') || undefined,
      clientIp: req.ip,
      userAgent: req.header('user-agent') ?? undefined,
    };
  }

  @Public()
  @Get('products')
  products() {
    return this.payments.listProducts();
  }

  @Post('orders')
  createOrder(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(createOrderSchema)) body: CreateOrder,
    @Req() req: Request,
  ) {
    return this.payments.createOrder(p, body, this.fbMeta(req));
  }

  @Post('orders/coupons/preview')
  previewCoupon(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(previewCouponSchema)) body: PreviewCoupon,
  ) {
    return this.payments.previewCoupon(p, body);
  }

  @Post('payments/razorpay/verify')
  verify(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(verifyPaymentSchema)) body: VerifyPayment,
    @Req() req: Request,
  ) {
    return this.payments.verify(p, body, this.fbMeta(req));
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
