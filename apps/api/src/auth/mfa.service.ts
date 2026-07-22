import { Inject, Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { ENV } from '../config/config.module';
import type { ApiEnv } from '@rajyarank/config/env';
import { PrismaService } from '../prisma/prisma.service';
import { decryptField, encryptField } from '../common/crypto.util';

@Injectable()
export class MfaService {
  constructor(
    @Inject(ENV) private readonly env: ApiEnv,
    private readonly prisma: PrismaService,
  ) {}

  /** Begin TOTP enrollment: returns the secret + otpauth URL for a QR code. */
  async enroll(userId: string, accountLabel: string): Promise<{ secret: string; otpauthUrl: string }> {
    const secret = authenticator.generateSecret();
    await this.prisma.mfaFactor.create({
      data: { userId, type: 'TOTP', status: 'PENDING', secretEnc: encryptField(secret, this.env.FIELD_ENCRYPTION_KEY) },
    });
    const otpauthUrl = authenticator.keyuri(accountLabel, 'RajyaRank', secret);
    return { secret, otpauthUrl };
  }

  async confirmEnrollment(userId: string, code: string): Promise<boolean> {
    const factor = await this.prisma.mfaFactor.findFirst({
      where: { userId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    if (!factor) return false;
    const secret = decryptField(factor.secretEnc, this.env.FIELD_ENCRYPTION_KEY);
    if (!authenticator.verify({ token: code, secret })) return false;
    await this.prisma.mfaFactor.update({ where: { id: factor.id }, data: { status: 'ACTIVE', confirmedAt: new Date() } });
    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
    return true;
  }

  async verify(userId: string, code: string): Promise<boolean> {
    const factor = await this.prisma.mfaFactor.findFirst({ where: { userId, status: 'ACTIVE' } });
    if (!factor) return false;
    const secret = decryptField(factor.secretEnc, this.env.FIELD_ENCRYPTION_KEY);
    return authenticator.verify({ token: code, secret });
  }
}
