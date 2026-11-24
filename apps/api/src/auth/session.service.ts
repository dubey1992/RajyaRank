import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ENV } from '../config/config.module';
import type { ApiEnv } from '@rajyarank/config/env';
import { PrismaService } from '../prisma/prisma.service';
import { randomToken, sha256 } from '../common/crypto.util';
import { NOT_REMEMBERED_REFRESH_TTL_SECONDS } from './cookies';

export interface IssuedSession {
  sessionId: string;
  refreshToken: string;
  familyId: string;
}

@Injectable()
export class SessionService {
  constructor(
    @Inject(ENV) private readonly env: ApiEnv,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    userId: string,
    assurance: 'AAL1' | 'AAL2',
    ip?: string,
    userAgent?: string,
    familyId: string = randomUUID(),
    remembered = false,
  ): Promise<IssuedSession> {
    const refreshToken = randomToken();
    const ttlSeconds = remembered ? this.env.REFRESH_TOKEN_TTL : NOT_REMEMBERED_REFRESH_TTL_SECONDS;
    const session = await this.prisma.loginSession.create({
      data: {
        userId,
        assurance,
        familyId,
        remembered,
        refreshTokenHash: sha256(refreshToken),
        ip: ip ?? null,
        userAgent: userAgent ?? null,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
    });
    await this.enforceConcurrentSessionLimit(userId);
    return { sessionId: session.id, refreshToken, familyId: session.familyId };
  }

  /**
   * Rotate a refresh token. If the presented token is unknown but belongs to a
   * known family (reuse of an already-rotated token), the entire family is
   * revoked — a strong signal of theft.
   */
  async rotate(
    rawToken: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ userId: string; assurance: 'AAL1' | 'AAL2'; remembered: boolean; issued: IssuedSession } | null> {
    const hash = sha256(rawToken);
    const session = await this.prisma.loginSession.findUnique({ where: { refreshTokenHash: hash } });

    if (!session || session.status !== 'ACTIVE' || session.expiresAt.getTime() < Date.now()) {
      return null;
    }

    // Rotate: revoke the current session row and mint a new one in the same family,
    // preserving the original "remember me" choice (and thus its TTL).
    await this.prisma.loginSession.update({
      where: { id: session.id },
      data: { status: 'REVOKED', revokedAt: new Date(), revokedReason: 'rotated' },
    });
    const issued = await this.create(session.userId, session.assurance, ip, userAgent, session.familyId, session.remembered);
    return { userId: session.userId, assurance: session.assurance, remembered: session.remembered, issued };
  }

  /** Grace window after a rotation within which the just-rotated-away token can
   *  still show up again without being treated as theft — covers a second,
   *  uncoordinated refresh call racing the first from the same browser (e.g.
   *  the admin SSR middleware's own silent refresh vs. the client's, or an
   *  old tab's in-flight request overlapping a newly opened one) rather than
   *  an attacker replaying a stolen token. */
  private static readonly ROTATION_GRACE_MS = 15_000;

  /** Detect reuse: a token hash not active but whose family still has sessions.
   *  Returns 'theft' (family revoked — a real signal to escalate/audit),
   *  'benign-race' (very recently rotated by the same legitimate flow — no
   *  action taken, the other concurrent request already has fresh cookies),
   *  or 'none' (token never existed / unrelated). */
  async checkReuse(rawToken: string): Promise<'theft' | 'benign-race' | 'none'> {
    const hash = sha256(rawToken);
    const revoked = await this.prisma.loginSession.findUnique({ where: { refreshTokenHash: hash } });
    if (!revoked || revoked.status !== 'REVOKED') return 'none';
    if (
      revoked.revokedReason === 'rotated' &&
      revoked.revokedAt &&
      Date.now() - revoked.revokedAt.getTime() < SessionService.ROTATION_GRACE_MS
    ) {
      return 'benign-race';
    }
    await this.revokeFamily(revoked.familyId, 'reuse-detected');
    return 'theft';
  }

  async revokeFamily(familyId: string, reason: string): Promise<void> {
    await this.prisma.loginSession.updateMany({
      where: { familyId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date(), revokedReason: reason },
    });
  }

  async revoke(sessionId: string, userId: string): Promise<void> {
    await this.prisma.loginSession.updateMany({
      where: { id: sessionId, userId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date(), revokedReason: 'user-logout' },
    });
  }

  async revokeAll(userId: string): Promise<void> {
    await this.prisma.loginSession.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date(), revokedReason: 'logout-all' },
    });
  }

  /** Cap concurrent active sessions per user — revokes the oldest beyond the limit. */
  private async enforceConcurrentSessionLimit(userId: string): Promise<void> {
    const limit = this.env.MAX_CONCURRENT_SESSIONS;
    const active = await this.prisma.loginSession.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (active.length <= limit) return;
    const toRevoke = active.slice(limit).map((s) => s.id);
    await this.prisma.loginSession.updateMany({
      where: { id: { in: toRevoke } },
      data: { status: 'REVOKED', revokedAt: new Date(), revokedReason: 'concurrent-session-limit' },
    });
  }

  async list(userId: string, currentSessionId?: string) {
    const sessions = await this.prisma.loginSession.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { lastUsedAt: 'desc' },
    });
    return sessions.map((s) => ({
      id: s.id,
      ip: s.ip,
      userAgent: s.userAgent,
      createdAt: s.createdAt.toISOString(),
      lastUsedAt: s.lastUsedAt.toISOString(),
      current: s.id === currentSessionId,
    }));
  }
}
