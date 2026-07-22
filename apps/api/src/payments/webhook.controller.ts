import { Controller, Headers, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';
import { AppError } from '../common/errors/app-error';

/**
 * Razorpay webhook. Verified via HMAC over the RAW body (rawBody enabled in
 * main.ts), idempotent via the provider event id. Never trusts the frontend.
 */
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly payments: PaymentsService) {}

  @Public()
  @Post('razorpay')
  async razorpay(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-razorpay-signature') signature: string,
    @Headers('x-razorpay-event-id') eventId: string,
  ) {
    const raw = req.rawBody?.toString('utf8') ?? JSON.stringify(req.body ?? {});
    if (!signature) throw AppError.paymentSignatureInvalid('Missing webhook signature.');
    return this.payments.handleWebhook(raw, signature, eventId || signature);
  }
}
