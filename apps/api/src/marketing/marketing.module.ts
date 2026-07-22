import { Module } from '@nestjs/common';
import { MarketingController, MarketingAdminController } from './marketing.controller';
import { MarketingService } from './marketing.service';

@Module({
  controllers: [MarketingController, MarketingAdminController],
  providers: [MarketingService],
})
export class MarketingModule {}
