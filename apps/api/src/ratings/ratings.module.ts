import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';

@Module({
  imports: [PaymentsModule],
  controllers: [RatingsController],
  providers: [RatingsService],
})
export class RatingsModule {}
