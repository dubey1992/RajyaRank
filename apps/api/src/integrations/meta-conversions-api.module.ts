import { Module } from '@nestjs/common';
import { MetaConversionsApiService } from './meta-conversions-api.service';

@Module({
  providers: [MetaConversionsApiService],
  exports: [MetaConversionsApiService],
})
export class MetaConversionsApiModule {}
