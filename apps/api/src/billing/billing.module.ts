import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { AcademicBillingController } from './academic-billing.controller';
import { BillingService } from './billing.service';
import { RazorpayModule } from '../payments/razorpay.module';

@Module({
  imports: [RazorpayModule],
  controllers: [BillingController, AcademicBillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
