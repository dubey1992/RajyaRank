import { Global, Module } from '@nestjs/common';
import { NotifierService } from './notifier.service';
import { NotificationService } from './notification.service';
import { PushService } from './push.service';
import { FcmService } from './fcm.service';
import { NotificationsController } from './notifications.controller';
import { DevQueueConsumerService } from './dev-queue-consumer.service';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotifierService, NotificationService, PushService, FcmService, DevQueueConsumerService],
  exports: [NotifierService, NotificationService, PushService, FcmService],
})
export class NotificationsModule {}
