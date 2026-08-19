import { Inject, Injectable, Logger } from '@nestjs/common';
import { initializeApp, cert, type App, type ServiceAccount } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { ENV } from '../config/config.module';
import type { ApiEnv } from '@rajyarank/config/env';
import { PrismaService } from '../prisma/prisma.service';

export interface DeviceTokenInput {
  token: string;
  platform: string;
}

/**
 * Native mobile push (FCM), parallel to PushService's role for Web Push.
 * Disabled (no-op) unless FCM_SERVICE_ACCOUNT_JSON is configured — same
 * degrade-gracefully contract as VAPID keys. Dead tokens (registration-token-
 * not-registered / invalid-argument) are pruned automatically on send.
 */
@Injectable()
export class FcmService {
  private readonly logger = new Logger('Fcm');
  private readonly enabled: boolean;
  private app: App | null = null;

  constructor(
    @Inject(ENV) private readonly env: ApiEnv,
    private readonly prisma: PrismaService,
  ) {
    this.enabled = !!env.FCM_SERVICE_ACCOUNT_JSON;
    if (this.enabled) {
      try {
        const credentials = JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON) as ServiceAccount;
        this.app = initializeApp({ credential: cert(credentials) }, 'fcm');
      } catch (err) {
        this.logger.error(`Invalid FCM_SERVICE_ACCOUNT_JSON: ${(err as Error).message}`);
        this.enabled = false;
      }
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async registerToken(userId: string, input: DeviceTokenInput): Promise<void> {
    await this.prisma.deviceToken.upsert({
      where: { token: input.token },
      create: { userId, token: input.token, platform: input.platform },
      update: { userId, platform: input.platform },
    });
  }

  async unregisterToken(userId: string, token: string): Promise<void> {
    await this.prisma.deviceToken.deleteMany({ where: { userId, token } });
  }

  /** Fan-out a push to every device token a user holds. Safe no-op when disabled. */
  async sendToUser(userId: string, payload: { title: string; body: string; data?: Record<string, string> }): Promise<void> {
    if (!this.enabled || !this.app) return;
    const tokens = await this.prisma.deviceToken.findMany({ where: { userId } });
    if (!tokens.length) return;

    const messaging = getMessaging(this.app);
    await Promise.all(
      tokens.map(async (t) => {
        try {
          await messaging.send({
            token: t.token,
            notification: { title: payload.title, body: payload.body },
            data: payload.data,
          });
        } catch (err) {
          const code = (err as { code?: string }).code;
          if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-argument') {
            await this.prisma.deviceToken.delete({ where: { id: t.id } }).catch(() => undefined);
          } else {
            this.logger.warn(`fcm send failed (${code ?? 'unknown'})`);
          }
        }
      }),
    );
  }
}
