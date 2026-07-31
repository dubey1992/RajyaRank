import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { DemoRequestsController } from './demo-requests.controller';
import { DemoRequestsService } from './demo-requests.service';

@Module({
  imports: [NotificationsModule],
  controllers: [DemoRequestsController],
  providers: [DemoRequestsService],
})
export class DemoRequestsModule {}
