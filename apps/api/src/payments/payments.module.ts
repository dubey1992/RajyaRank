import { Module } from '@nestjs/common';
import { EntitlementService } from './entitlement.service';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { WebhookController } from './webhook.controller';
import { AdminPaymentsController } from './admin-payments.controller';
import { AcademicPaymentsController } from './academic-payments.controller';
import { RazorpayModule } from './razorpay.module';
import { BillingModule } from '../billing/billing.module';
import { SettlementsModule } from '../settlements/settlements.module';

@Module({
  imports: [RazorpayModule, BillingModule, SettlementsModule],
  controllers: [PaymentsController, WebhookController, AdminPaymentsController, AcademicPaymentsController],
  providers: [EntitlementService, PaymentsService],
  exports: [EntitlementService],
})
export class PaymentsModule {}
