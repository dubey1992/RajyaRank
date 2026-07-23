import { Inject, Injectable } from '@nestjs/common';
import { ENV } from '../config/config.module';
import type { ApiEnv } from '@rajyarank/config/env';
import { PrismaService } from '../prisma/prisma.service';
import { randomToken, sha256 } from '../common/crypto.util';

@Injectable()
export class TrustedDeviceService {
  constructor(
    @Inject(ENV) private readonly env: ApiEnv,
    private readonly prisma: PrismaService,
  ) {}

  async create(userId: string, ip?: string, userAgent?: string): Promise<{ rawToken: string; expiresAt: Date }> {
    const rawToken = randomToken();
    const expiresAt = new Date(Date.now() + this.env.TRUSTED_DEVICE_TTL * 1000);
    await this.prisma.trustedDevice.create({
      data: {
        userId,
        tokenHash: sha256(rawToken),
        ip: ip ?? null,
        userAgent: userAgent ?? null,
        expiresAt,
      },
    });
    return { rawToken, expiresAt };
  }

  /**
   * Checks whether a raw trusted-device token is valid for this user. Must
   * fail open to "MFA still required" on any miss (unknown/expired/revoked/
   * wrong-user token) — never throws, only ever returns a boolean.
   */
  async verify(rawToken: string, userId: string): Promise<boolean> {
    const hash = sha256(rawToken);
    const device = await this.prisma.trustedDevice.findUnique({ where: { tokenHash: hash } });
    if (!device || device.userId !== userId || device.status !== 'ACTIVE' || device.expiresAt.getTime() < Date.now()) {
      return false;
    }
    await this.prisma.trustedDevice.update({ where: { id: device.id }, data: { lastUsedAt: new Date() } });
    return true;
  }

  async revoke(deviceId: string, userId: string): Promise<void> {
    await this.prisma.trustedDevice.updateMany({
      where: { id: deviceId, userId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date(), revokedReason: 'user-revoked' },
    });
  }

  async revokeAll(userId: string, reason: string = 'password-changed'): Promise<void> {
    await this.prisma.trustedDevice.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date(), revokedReason: reason },
    });
  }

  async list(userId: string, currentTokenHash?: string) {
    const devices = await this.prisma.trustedDevice.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { lastUsedAt: 'desc' },
    });
    return devices.map((d) => ({
      id: d.id,
      ip: d.ip,
      userAgent: d.userAgent,
      createdAt: d.createdAt.toISOString(),
      lastUsedAt: d.lastUsedAt.toISOString(),
      expiresAt: d.expiresAt.toISOString(),
      current: d.tokenHash === currentTokenHash,
    }));
  }
}
