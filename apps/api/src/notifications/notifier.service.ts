import { Inject, Injectable, Logger } from '@nestjs/common';
import { ENV } from '../config/config.module';
import type { ApiEnv } from '@rajyarank/config/env';
import { RedisService } from '../redis/redis.service';

export const EMAIL_QUEUE = 'rr:queue:email';
export const SMS_QUEUE = 'rr:queue:sms';

export interface EmailAttachment {
  filename: string;
  /** Base64-encoded content — Buffers don't survive JSON.stringify onto the
   *  Redis queue, so the binary is base64'd here and passed straight through
   *  to nodemailer's `encoding: 'base64'` attachment option on delivery. */
  contentBase64: string;
  contentType?: string;
}

export interface EmailJob {
  to: string;
  subject: string;
  html: string;
  locale: 'hi' | 'en';
  attachments?: EmailAttachment[];
}

/**
 * Provider-agnostic outbound notifier. The API never sends directly; it
 * enqueues jobs (Redis list) that apps/worker consumes and delivers via SMTP /
 * SMS gateway. In dev, SMS_PROVIDER=log also prints the code for convenience.
 */
@Injectable()
export class NotifierService {
  private readonly logger = new Logger('Notifier');

  constructor(
    @Inject(ENV) private readonly env: ApiEnv,
    private readonly redis: RedisService,
  ) {}

  async sendOtpSms(phone: string, code: string): Promise<void> {
    if (this.env.SMS_PROVIDER === 'log') {
      this.logger.log(`[dev SMS] OTP for ${maskPhone(phone)} → ${code}`);
    }
    await this.redis.client.lpush(
      SMS_QUEUE,
      JSON.stringify({ phone, text: `${code} is your RajyaRank verification code.` }),
    );
  }

  async sendEmail(job: EmailJob): Promise<void> {
    await this.redis.client.lpush(EMAIL_QUEUE, JSON.stringify(job));
    if (this.env.NODE_ENV !== 'production') {
      this.logger.log(`[dev email] queued → ${job.to} :: ${job.subject}`);
    }
  }

  async sendSms(phone: string, text: string): Promise<void> {
    if (this.env.SMS_PROVIDER === 'log') this.logger.log(`[dev SMS] ${maskPhone(phone)} → ${text}`);
    await this.redis.client.lpush(SMS_QUEUE, JSON.stringify({ phone, text }));
  }
}

function maskPhone(p: string): string {
  return p.length >= 4 ? `••••••${p.slice(-4)}` : '••••';
}
