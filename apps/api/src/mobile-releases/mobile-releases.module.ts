import { Module } from '@nestjs/common';
import { MobileReleasesController } from './mobile-releases.controller';
import { AppReleasesController } from './app-releases.controller';
import { MobileReleasesService } from './mobile-releases.service';

@Module({
  controllers: [MobileReleasesController, AppReleasesController],
  providers: [MobileReleasesService],
})
export class MobileReleasesModule {}
