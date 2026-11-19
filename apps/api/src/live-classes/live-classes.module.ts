import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { LiveClassesController, StudentLiveClassesController } from './live-classes.controller';
import { LiveClassesService } from './live-classes.service';
import { LiveClassReminderScheduler } from './live-class-reminder.scheduler';

@Module({
  imports: [PaymentsModule], // for EntitlementService
  controllers: [LiveClassesController, StudentLiveClassesController],
  providers: [LiveClassesService, LiveClassReminderScheduler],
})
export class LiveClassesModule {}
