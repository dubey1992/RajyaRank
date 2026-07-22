import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { notificationPreferenceSchema, type NotificationPreferenceInput } from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { NotificationService } from './notification.service';
import { PushService, type PushSubscriptionInput } from './push.service';

@Controller('student/notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationService,
    private readonly push: PushService,
  ) {}

  // ── Web push ──
  @Get('push/vapid-key')
  vapidKey() {
    return { key: this.push.vapidPublicKey(), enabled: this.push.isEnabled() };
  }

  @Post('push/subscribe')
  subscribe(@CurrentPrincipal() p: Principal, @Body() body: PushSubscriptionInput) {
    return this.push.subscribe(p.userId, body).then(() => ({ subscribed: true }));
  }

  @Post('push/unsubscribe')
  unsubscribe(@CurrentPrincipal() p: Principal, @Body() body: { endpoint: string }) {
    return this.push.unsubscribe(p.userId, body.endpoint).then(() => ({ unsubscribed: true }));
  }

  @Get()
  list(@CurrentPrincipal() p: Principal) {
    return this.notifications.list(p.userId);
  }

  @Patch('read-all')
  readAll(@CurrentPrincipal() p: Principal) {
    return this.notifications.markAllRead(p.userId);
  }

  @Patch(':id/read')
  read(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.notifications.markRead(p.userId, id);
  }

  @Get('preferences')
  getPrefs(@CurrentPrincipal() p: Principal) {
    return this.notifications.getPreferences(p.userId);
  }

  @Patch('preferences')
  setPrefs(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(notificationPreferenceSchema)) body: NotificationPreferenceInput,
  ) {
    return this.notifications.setPreferences(p.userId, body);
  }
}
