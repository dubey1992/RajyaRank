import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { confirmPaymentMethodSchema, type ConfirmPaymentMethod } from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PaymentMethodsService } from './payment-methods.service';

/** Saved cards, scoped to "whoever is logged in" — same for students and
 *  staff, no special permission needed beyond being authenticated (matches
 *  the /orders, /student/entitlements pattern in payments.controller.ts). */
@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethods: PaymentMethodsService) {}

  @Get()
  list(@CurrentPrincipal() p: Principal) {
    return this.paymentMethods.list(p.userId);
  }

  @Post('setup-intent')
  setupIntent(@CurrentPrincipal() p: Principal) {
    return this.paymentMethods.setupIntent(p);
  }

  @Post('confirm')
  confirm(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(confirmPaymentMethodSchema)) body: ConfirmPaymentMethod,
  ) {
    return this.paymentMethods.confirm(p, body);
  }

  @Patch(':id/default')
  setDefault(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.paymentMethods.setDefault(p, id);
  }

  @Delete(':id')
  remove(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.paymentMethods.remove(p, id);
  }
}
