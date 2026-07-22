import { Global, Module } from '@nestjs/common';
import { NotifierService } from './notifier.service';
import { NotificationService } from './notification.service';
import { PushService } from './push.service';
import { NotificationsController } from './notifications.controller';
import { DevQueueConsumerService } from './dev-queue-consumer.service';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotifierService, NotificationService, PushService, DevQueueConsumerService],
  exports: [NotifierService, NotificationService, PushService],
})
export class NotificationsModule {}
