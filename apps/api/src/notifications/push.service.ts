import { Inject, Injectable, Logger } from '@nestjs/common';
import webpush from 'web-push';
import { ENV } from '../config/config.module';
import type { ApiEnv } from '@rajyarank/config/env';
import { PrismaService } from '../prisma/prisma.service';

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Web Push (VAPID) delivery (§17). Disabled (no-op) unless VAPID keys are
 * configured. Subscriptions are stored per user; dead endpoints (404/410) are
 * pruned automatically on send.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger('Push');
  private readonly enabled: boolean;

  constructor(
    @Inject(ENV) private readonly env: ApiEnv,
    private readonly prisma: PrismaService,
  ) {
    this.enabled = !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
    if (this.enabled) {
      webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    }
  }

  vapidPublicKey(): string {
    return this.env.VAPID_PUBLIC_KEY;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async subscribe(userId: string, sub: PushSubscriptionInput): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
  }

  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  }

  /** Fan-out a push to every subscription a user holds. Safe no-op when disabled. */
  async sendToUser(userId: string, payload: { title: string; body: string; url?: string }): Promise<void> {
    if (!this.enabled) return;
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    const body = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body);
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await this.prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => undefined);
          } else {
            this.logger.warn(`push send failed (${status ?? 'unknown'})`);
          }
        }
      }),
    );
  }
}
