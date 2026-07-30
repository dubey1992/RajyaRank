import { Module } from '@nestjs/common';
import { OfficialNoticesController } from './official-notices.controller';
import { OfficialNoticesService } from './official-notices.service';

@Module({
  controllers: [OfficialNoticesController],
  providers: [OfficialNoticesService],
})
export class OfficialNoticesModule {}
