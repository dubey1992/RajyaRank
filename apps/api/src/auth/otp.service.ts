import { Inject, Injectable } from '@nestjs/common';
import { ENV } from '../config/config.module';
import type { ApiEnv } from '@rajyarank/config/env';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotifierService } from '../notifications/notifier.service';
import { otpCodeEmail } from '../notifications/email-templates/auth';
import { numericOtp, safeEqualHex, sha256 } from '../common/crypto.util';
import { AppError } from '../common/errors/app-error';

type Purpose = 'STUDENT_LOGIN' | 'STAFF_LOGIN' | 'EMAIL_VERIFY' | 'PASSWORD_RESET' | 'STEP_UP';

@Injectable()
export class OtpService {
  constructor(
    @Inject(ENV) private readonly env: ApiEnv,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifier: NotifierService,
  ) {}

  /** Create + dispatch an OTP. Rate-limited per destination and per IP. */
  async request(destination: string, channel: 'SMS' | 'EMAIL', purpose: Purpose, ip?: string): Promise<void> {
    const okDest = await this.redis.allow(`otp:req:${purpose}:${destination}`, 5, 15 * 60);
    const okIp = ip ? await this.redis.allow(`otp:ip:${ip}`, 20, 15 * 60) : true;
    if (!okDest || !okIp) throw AppError.otpTooManyAttempts();

    const code = numericOtp();
    const expiresAt = new Date(Date.now() + this.env.OTP_TTL * 1000);
    await this.prisma.otpChallenge.create({
      data: {
        channel,
        purpose,
        destination,
        codeHash: sha256(code),
        maxAttempts: this.env.OTP_MAX_ATTEMPTS,
        expiresAt,
        ip: ip ?? null,
      },
    });
    if (channel === 'SMS') await this.notifier.sendOtpSms(destination, code);
    else {
      const { subject, html } = otpCodeEmail('en', code, Math.round(this.env.OTP_TTL / 60));
      await this.notifier.sendEmail({ to: destination, subject, html, locale: 'en' });
    }
  }

  /** Verify + consume the latest live OTP for a destination/purpose. */
  async verify(destination: string, purpose: Purpose, code: string): Promise<void> {
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { destination, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge) throw AppError.otpInvalid();
    if (challenge.expiresAt.getTime() < Date.now()) throw AppError.otpExpired();
    if (challenge.attempts >= challenge.maxAttempts) throw AppError.otpTooManyAttempts();

    // TESTING ONLY: a fixed bypass code accepted on local/staging so QA can log in
    // without reading the dev SMS log. Never active in preproduction/production.
    const devBypass = (this.env.APP_ENV === 'local' || this.env.APP_ENV === 'staging') && code === '555555';

    if (!devBypass && !safeEqualHex(challenge.codeHash, sha256(code))) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw AppError.otpInvalid();
    }
    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
  }
}
