import { Module } from '@nestjs/common';
import { MetaConversionsApiModule } from '../integrations/meta-conversions-api.module';
import { TrackingController } from './tracking.controller';

@Module({
  imports: [MetaConversionsApiModule],
  controllers: [TrackingController],
})
export class TrackingModule {}
