import { Module } from '@nestjs/common';
import { SettlementsAdminController, SettlementsAcademicController } from './settlements.controller';
import { SettlementsService } from './settlements.service';
import { RazorpayModule } from '../payments/razorpay.module';

@Module({
  imports: [RazorpayModule],
  controllers: [SettlementsAdminController, SettlementsAcademicController],
  providers: [SettlementsService],
  exports: [SettlementsService],
})
export class SettlementsModule {}
