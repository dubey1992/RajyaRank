import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ENV } from '../config/config.module';
import type { ApiEnv } from '@rajyarank/config/env';
import { RedisService } from '../redis/redis.service';
import { EMAIL_QUEUE, SMS_QUEUE, type EmailJob } from './notifier.service';

/**
 * Dev-only stand-in for apps/worker's queue consumer. In every real
 * environment, delivery is a separate worker process reading a shared Redis —
 * see apps/worker/src/main.ts. That split doesn't work when REDIS_INMEMORY=true
 * (local dev without Docker/Redis): the mock Redis instance lives only inside
 * this API process's memory, so a separate worker process could never see
 * what got enqueued here. Rather than leave emails/SMS silently undelivered
 * in that mode, drain the same in-process queue right here. Hard-gated to
 * non-production and REDIS_INMEMORY — everywhere else this is a no-op and
 * apps/worker remains the only delivery path.
 */
@Injectable()
export class DevQueueConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('DevQueueConsumer');
  private running = false;
  private loopPromise: Promise<void> | null = null;
  private mailer: nodemailer.Transporter | null = null;

  constructor(
    @Inject(ENV) private readonly env: ApiEnv,
    private readonly redis: RedisService,
  ) {}

  onModuleInit() {
    if (process.env.REDIS_INMEMORY !== 'true' || this.env.APP_ENV === 'production') return;
    this.mailer = nodemailer.createTransport({
      host: this.env.SMTP_HOST,
      port: this.env.SMTP_PORT,
      secure: false,
      auth: this.env.SMTP_USER ? { user: this.env.SMTP_USER, pass: this.env.SMTP_PASS } : undefined,
    });
    this.running = true;
    this.logger.warn('REDIS_INMEMORY=true — delivering queued email/SMS in-process (no separate worker in this mode).');
    this.loopPromise = this.loop();
  }

  async onModuleDestroy() {
    this.running = false;
    if (this.loopPromise) await this.loopPromise;
  }

  private async loop() {
    while (this.running) {
      try {
        const email = await this.redis.client.rpop(EMAIL_QUEUE);
        if (email) {
          await this.handleEmail(email);
          continue; // drain bursts without sleeping between items
        }
        const sms = await this.redis.client.rpop(SMS_QUEUE);
        if (sms) {
          this.handleSms(sms);
          continue;
        }
      } catch (err) {
        this.logger.error('queue consume error', err as Error);
      }
      await sleep(300);
    }
  }

  private async handleEmail(raw: string) {
    const job = JSON.parse(raw) as EmailJob;
    try {
      await this.mailer!.sendMail({
        from: this.env.EMAIL_FROM,
        to: job.to,
        subject: job.subject,
        html: job.html,
        attachments: job.attachments?.map((a) => ({ filename: a.filename, content: a.contentBase64, encoding: 'base64' as const, contentType: a.contentType })),
      });
      this.logger.log(`[dev email] delivered → ${job.to} :: ${job.subject}`);
    } catch (err) {
      this.logger.error(`[dev email] delivery failed → ${job.to} (is a local SMTP catcher running on ${this.env.SMTP_HOST}:${this.env.SMTP_PORT}?)`, err as Error);
    }
  }

  private handleSms(raw: string) {
    const job = JSON.parse(raw) as { phone: string; text: string };
    this.logger.log(`[dev sms] ${job.phone.slice(-4).padStart(job.phone.length, '•')} → ${job.text}`);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
