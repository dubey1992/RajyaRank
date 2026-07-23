import { Inject, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { ROLE_HOME_ROUTE, type RoleKey } from '@rajyarank/auth';
import type { MeResponse, StaffLoginResult } from '@rajyarank/contracts';
import { ENV } from '../config/config.module';
import type { ApiEnv } from '@rajyarank/config/env';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuditService } from '../audit/audit.service';
import { OtpService } from './otp.service';
import { MfaService } from './mfa.service';
import { SessionService } from './session.service';
import { TrustedDeviceService } from './trusted-device.service';
import { TokenService } from './token.service';
import { clearAuthCookies, clearTrustedDeviceCookie, refreshCookieName, setAuthCookies, setTrustedDeviceCookie } from './cookies';
import { NotificationService } from '../notifications/notification.service';
import { passwordChangedEmail } from '../notifications/email-templates/auth';
import { AppError } from '../common/errors/app-error';

/** Priority order used to pick the landing route for multi-role staff. */
const ROLE_PRIORITY: RoleKey[] = [
  'SUPER_ADMIN',
  'ACADEMIC_HEAD',
  'CONTENT_ADMIN',
  'ACADEMIC_REVIEWER',
  'QUESTION_SETTER',
  'TEACHER',
  'SUPPORT_AGENT',
  'STUDENT',
];

@Injectable()
export class AuthService {
  constructor(
    @Inject(ENV) private readonly env: ApiEnv,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly otp: OtpService,
    private readonly mfa: MfaService,
    private readonly sessions: SessionService,
    private readonly trustedDevices: TrustedDeviceService,
    private readonly tokens: TokenService,
    private readonly notifications: NotificationService,
  ) {}

  // ── Student ────────────────────────────────────────────────────────────────
  async studentOtpRequest(phone: string, ip?: string): Promise<{ expiresInSeconds: number }> {
    await this.otp.request(phone, 'SMS', 'STUDENT_LOGIN', ip);
    return { expiresInSeconds: this.env.OTP_TTL };
  }

  async studentOtpVerify(
    phone: string,
    code: string,
    res: Response,
    ip?: string,
    userAgent?: string,
  ): Promise<{ homeRoute: string }> {
    await this.otp.verify(phone, 'STUDENT_LOGIN', code);

    let user = await this.prisma.user.findFirst({ where: { kind: 'STUDENT', phone } });
    if (!user) {
      const studentRole = await this.prisma.role.findUniqueOrThrow({ where: { key: 'STUDENT' } });
      try {
        user = await this.prisma.user.create({
          data: {
            kind: 'STUDENT',
            status: 'ACTIVE',
            phone,
            phoneVerified: true,
            displayName: null,
            identities: { create: { provider: 'PHONE', providerUid: phone } },
            studentProfile: { create: {} },
            roles: { create: { roleId: studentRole.id } },
          },
        });
      } catch (err) {
        // Two near-simultaneous first-time verifies for the same new phone can
        // both pass the findFirst check above; the loser hits the @@unique
        // constraint. Rather than a raw 500, fall in behind the winner's row.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          user = await this.prisma.user.findFirst({ where: { kind: 'STUDENT', phone } });
          if (!user) throw err;
        } else {
          throw err;
        }
      }
    } else if (!user.phoneVerified || user.status !== 'ACTIVE') {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { phoneVerified: true, status: 'ACTIVE' },
      });
    }

    await this.issue(res, user.id, 'STUDENT', 'AAL1', ip, userAgent);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.record({ actorUserId: user.id, action: 'auth.login', result: 'SUCCESS', ip, userAgent });
    return { homeRoute: ROLE_HOME_ROUTE.STUDENT };
  }

  // ── Student email + password (signup verifies the email first, same trust
  //    bar as phone OTP/Google — unlike staff, created via invite-accept). ──
  /** Existence-check is a deliberate signup UX (not the silent forgot-password
   *  behaviour below) — every consumer app tells you "that email is taken." */
  async studentSignupRequest(email: string, ip?: string): Promise<void> {
    const normalized = email.toLowerCase();
    const existing = await this.prisma.user.findFirst({ where: { kind: 'STUDENT', email: normalized, deletedAt: null } });
    if (existing) throw AppError.conflict('An account with this email already exists. Try logging in instead.');
    await this.otp.request(normalized, 'EMAIL', 'EMAIL_VERIFY', ip);
  }

  async studentSignupVerify(
    email: string,
    code: string,
    password: string,
    res: Response,
    ip?: string,
    userAgent?: string,
  ): Promise<{ homeRoute: string }> {
    const normalized = email.toLowerCase();
    await this.otp.verify(normalized, 'EMAIL_VERIFY', code);

    // Race guard: two concurrent signups for the same email could both reach
    // here between the request-time check and now.
    const existing = await this.prisma.user.findFirst({ where: { kind: 'STUDENT', email: normalized, deletedAt: null } });
    if (existing) throw AppError.conflict('An account with this email already exists. Try logging in instead.');

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const studentRole = await this.prisma.role.findUniqueOrThrow({ where: { key: 'STUDENT' } });
    const user = await this.prisma.user.create({
      data: {
        kind: 'STUDENT',
        status: 'ACTIVE',
        email: normalized,
        emailVerified: true,
        passwordHash,
        displayName: null,
        studentProfile: { create: {} },
        roles: { create: { roleId: studentRole.id } },
      },
    });

    await this.issue(res, user.id, 'STUDENT', 'AAL1', ip, userAgent);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.record({ actorUserId: user.id, action: 'auth.signup', result: 'SUCCESS', ip, userAgent });
    return { homeRoute: ROLE_HOME_ROUTE.STUDENT };
  }

  /** Same shape as staffLogin, minus the MFA branch — no student MFA exists anywhere. */
  /** Redis key for the destination-level (not user-level) failed-login
   *  counter — see bumpDestinationFailure(). */
  private destLoginKey(kind: 'STUDENT' | 'STAFF', destination: string): string {
    return `login-fail:${kind}:${destination}`;
  }

  /**
   * Increments the failure counter for this destination (email/phone, not
   * user id) and returns whether THIS attempt reached the lockout threshold
   * — mirrors the real-account logic below (`failed >= LOGIN_MAX_FAILURES`)
   * exactly, tripping on the same Nth attempt rather than the (N+1)th, so
   * timing can't distinguish the two cases. Without this, only REAL accounts
   * can ever reach a lockout response at all (the `!user` branch always
   * short-circuits straight to invalid-credentials) — an attacker could tell
   * a registered destination apart from a made-up one just by seeing
   * whether repeated attempts against it ever start returning
   * ACCOUNT_LOCKED. Every subsequent attempt against an already-tripped
   * destination re-derives the same "locked" answer from this same counter,
   * so no separate "already locked" pre-check is needed.
   */
  private async bumpDestinationFailure(kind: 'STUDENT' | 'STAFF', destination: string): Promise<boolean> {
    const key = this.destLoginKey(kind, destination);
    const count = await this.redis.client.incr(key);
    if (count === 1) await this.redis.client.expire(key, this.env.LOGIN_LOCKOUT_MINUTES * 60);
    return count >= this.env.LOGIN_MAX_FAILURES;
  }

  private async clearDestinationFailures(kind: 'STUDENT' | 'STAFF', destination: string): Promise<void> {
    await this.redis.client.del(this.destLoginKey(kind, destination));
  }

  async studentLogin(
    email: string,
    password: string,
    res: Response,
    ip?: string,
    userAgent?: string,
    remember = false,
  ): Promise<{ homeRoute: string }> {
    const normalized = email.toLowerCase();
    const user = await this.prisma.user.findFirst({ where: { kind: 'STUDENT', email: normalized, deletedAt: null } });
    if (!user || !user.passwordHash) {
      const destLocked = await this.bumpDestinationFailure('STUDENT', normalized);
      await this.audit.record({ action: 'auth.login', result: 'FAILED', reasonCode: destLocked ? 'ACCOUNT_LOCKED' : 'AUTH_INVALID_CREDENTIALS', ip, userAgent });
      throw destLocked ? AppError.accountLocked() : AppError.invalidCredentials();
    }
    if (user.status === 'DISABLED' || user.status === 'SUSPENDED') throw AppError.accountDisabled();
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) throw AppError.accountLocked();

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) {
      const destLocked = await this.bumpDestinationFailure('STUDENT', normalized);
      const failed = user.failedLogins + 1;
      const lock = destLocked || failed >= this.env.LOGIN_MAX_FAILURES;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLogins: lock ? 0 : failed,
          lockedUntil: lock ? new Date(Date.now() + this.env.LOGIN_LOCKOUT_MINUTES * 60_000) : null,
        },
      });
      await this.audit.record({ actorUserId: user.id, action: 'auth.login', result: 'FAILED', reasonCode: lock ? 'ACCOUNT_LOCKED' : 'AUTH_INVALID_CREDENTIALS', ip, userAgent });
      throw lock ? AppError.accountLocked() : AppError.invalidCredentials();
    }

    await this.clearDestinationFailures('STUDENT', normalized);
    await this.prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
    await this.issue(res, user.id, 'STUDENT', 'AAL1', ip, userAgent, remember);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.record({ actorUserId: user.id, action: 'auth.login', result: 'SUCCESS', ip, userAgent });
    return { homeRoute: ROLE_HOME_ROUTE.STUDENT };
  }

  /** Always resolves successfully to avoid leaking whether an account exists — same privacy stance as staff's. */
  async studentPasswordForgot(email: string, ip?: string): Promise<void> {
    const normalized = email.toLowerCase();
    const user = await this.prisma.user.findFirst({ where: { kind: 'STUDENT', email: normalized, deletedAt: null } });
    if (user) await this.otp.request(normalized, 'EMAIL', 'PASSWORD_RESET', ip);
  }

  async studentPasswordReset(email: string, code: string, password: string, ip?: string, userAgent?: string): Promise<void> {
    const normalized = email.toLowerCase();
    await this.otp.verify(normalized, 'PASSWORD_RESET', code);
    const user = await this.prisma.user.findFirst({ where: { kind: 'STUDENT', email: normalized, deletedAt: null } });
    if (!user) throw AppError.otpInvalid();
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, failedLogins: 0, lockedUntil: null },
    });
    await this.sessions.revokeAll(user.id);
    await this.trustedDevices.revokeAll(user.id);
    await this.notifications.emit({
      userId: user.id,
      category: 'SECURITY',
      titleHi: 'पासवर्ड बदला गया',
      titleEn: 'Password changed',
      bodyHi: 'आपके खाते का पासवर्ड बदल दिया गया है।',
      bodyEn: 'Your account password was changed.',
      email: (locale) => passwordChangedEmail(locale),
    });
    await this.audit.record({ actorUserId: user.id, action: 'auth.password_reset', result: 'SUCCESS', ip, userAgent });
  }

  /** Change password while already authenticated (current-password required) —
   *  kind-agnostic, works for STAFF and STUDENT alike since passwordHash isn't
   *  scoped by kind. Revokes every session (same as passwordReset) — the
   *  caller re-authenticates, including the tab that just changed it. */
  async changePassword(userId: string, currentPassword: string, newPassword: string, ip?: string, userAgent?: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash || !(await argon2.verify(user.passwordHash, currentPassword))) {
      await this.audit.record({ actorUserId: userId, action: 'auth.password_change', result: 'FAILED', reasonCode: 'AUTH_INVALID_CREDENTIALS', ip, userAgent });
      throw AppError.invalidCredentials();
    }
    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.sessions.revokeAll(userId);
    await this.trustedDevices.revokeAll(userId);
    await this.notifications.emit({
      userId,
      category: 'SECURITY',
      titleHi: 'पासवर्ड बदला गया',
      titleEn: 'Password changed',
      bodyHi: 'आपके खाते का पासवर्ड बदल दिया गया है।',
      bodyEn: 'Your account password was changed.',
      email: (locale) => passwordChangedEmail(locale),
    });
    await this.audit.record({ actorUserId: userId, action: 'auth.password_change', result: 'SUCCESS', ip, userAgent });
  }

  // ── Staff ────────────────────────────────────────────────────────────────
  async staffLogin(
    workEmail: string,
    password: string,
    res: Response,
    ip?: string,
    userAgent?: string,
    remember = false,
    trustedDeviceToken?: string,
  ): Promise<StaffLoginResult> {
    const email = workEmail.toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { kind: 'STAFF', email, deletedAt: null },
      include: { roles: { include: { role: true } } },
    });
    if (!user || !user.passwordHash) {
      const destLocked = await this.bumpDestinationFailure('STAFF', email);
      await this.audit.record({ action: 'auth.login', result: 'FAILED', reasonCode: destLocked ? 'ACCOUNT_LOCKED' : 'AUTH_INVALID_CREDENTIALS', ip, userAgent });
      throw destLocked ? AppError.accountLocked() : AppError.invalidCredentials();
    }
    if (user.status === 'DISABLED' || user.status === 'SUSPENDED') throw AppError.accountDisabled();
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) throw AppError.accountLocked();

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) {
      const destLocked = await this.bumpDestinationFailure('STAFF', email);
      const failed = user.failedLogins + 1;
      const lock = destLocked || failed >= this.env.LOGIN_MAX_FAILURES;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLogins: lock ? 0 : failed,
          lockedUntil: lock ? new Date(Date.now() + this.env.LOGIN_LOCKOUT_MINUTES * 60_000) : null,
        },
      });
      await this.audit.record({ actorUserId: user.id, action: 'auth.login', result: 'FAILED', reasonCode: lock ? 'ACCOUNT_LOCKED' : 'AUTH_INVALID_CREDENTIALS', ip, userAgent });
      throw lock ? AppError.accountLocked() : AppError.invalidCredentials();
    }

    await this.clearDestinationFailures('STAFF', email);
    await this.prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });

    // TESTING ONLY: skip MFA and grant AAL2 directly. Hard-gated to local dev
    // only — staging is a real, internet-reachable deployment.
    const skipMfa = this.env.APP_ENV === 'local' && this.env.AUTH_DEV_SKIP_MFA;
    if (user.mfaEnabled && !skipMfa) {
      // A previously-trusted device skips the TOTP challenge but still had to
      // present the correct password above — trust never replaces auth, only MFA.
      const trusted = trustedDeviceToken && (await this.trustedDevices.verify(trustedDeviceToken, user.id));
      if (trusted) {
        await this.issue(res, user.id, 'STAFF', 'AAL2', ip, userAgent, remember);
        await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        await this.audit.record({ actorUserId: user.id, action: 'auth.login.mfa_skipped_trusted_device', result: 'SUCCESS', ip, userAgent });
        return { status: 'AUTHENTICATED', homeRoute: this.homeRouteFor(user.roles.map((r) => r.role.key as RoleKey)) };
      }
      await this.audit.record({ actorUserId: user.id, action: 'auth.login.mfa_required', result: 'SUCCESS', ip, userAgent });
      return { status: 'MFA_REQUIRED', mfaToken: this.tokens.signMfaChallenge(user.id, remember) };
    }
    if (user.mfaEnabled && skipMfa) {
      await this.issue(res, user.id, 'STAFF', 'AAL2', ip, userAgent, remember);
      await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      await this.audit.record({ actorUserId: user.id, action: 'auth.login.mfa_skipped_dev', result: 'SUCCESS', ip, userAgent });
      return { status: 'AUTHENTICATED', homeRoute: this.homeRouteFor(user.roles.map((r) => r.role.key as RoleKey)) };
    }

    await this.issue(res, user.id, 'STAFF', 'AAL1', ip, userAgent, remember);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.record({ actorUserId: user.id, action: 'auth.login', result: 'SUCCESS', ip, userAgent });
    return { status: 'AUTHENTICATED', homeRoute: this.homeRouteFor(user.roles.map((r) => r.role.key as RoleKey)) };
  }

  async staffMfaVerify(
    mfaToken: string,
    totp: string,
    res: Response,
    ip?: string,
    userAgent?: string,
    trustDevice = false,
  ): Promise<{ homeRoute: string }> {
    let sub: string;
    let remember: boolean;
    try {
      ({ sub, remember } = this.tokens.verifyMfaChallenge(mfaToken));
    } catch {
      throw AppError.mfaRequired();
    }
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: sub },
      include: { roles: { include: { role: true } } },
    });
    // Reuse the same account-lockout policy as password login — otherwise
    // a stolen/reused password lets an attacker grind the 6-digit TOTP
    // space indefinitely (the mfaToken's 5-min expiry + IP-keyed throttle
    // are both trivially bypassed by rotating source IPs).
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) throw AppError.accountLocked();

    const ok = await this.mfa.verify(sub, totp);
    if (!ok) {
      const failed = user.failedLogins + 1;
      const lock = failed >= this.env.LOGIN_MAX_FAILURES;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLogins: lock ? 0 : failed,
          lockedUntil: lock ? new Date(Date.now() + this.env.LOGIN_LOCKOUT_MINUTES * 60_000) : null,
        },
      });
      await this.audit.record({ actorUserId: sub, action: 'auth.mfa', result: 'FAILED', reasonCode: lock ? 'ACCOUNT_LOCKED' : 'AUTH_MFA_INVALID', ip, userAgent });
      throw lock ? AppError.accountLocked() : AppError.mfaInvalid();
    }

    await this.issue(res, user.id, 'STAFF', 'AAL2', ip, userAgent, remember);
    if (trustDevice) {
      const { rawToken, expiresAt } = await this.trustedDevices.create(user.id, ip, userAgent);
      setTrustedDeviceCookie(res, this.env, rawToken, Math.round((expiresAt.getTime() - Date.now()) / 1000));
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
    await this.audit.record({ actorUserId: user.id, action: 'auth.login', result: 'SUCCESS', reasonCode: 'AAL2', ip, userAgent });
    return { homeRoute: this.homeRouteFor(user.roles.map((r) => r.role.key as RoleKey)) };
  }

  // ── Sessions ────────────────────────────────────────────────────────────────
  async refresh(req: Request & { cookies?: Record<string, string> }, res: Response): Promise<{ ok: true }> {
    const raw =
      req.cookies?.[refreshCookieName('STAFF')] ?? req.cookies?.[refreshCookieName('STUDENT')] ?? null;
    if (!raw) throw AppError.sessionExpired();

    const ip = req.ip;
    const ua = req.header('user-agent') ?? undefined;
    const result = await this.sessions.rotate(raw, ip, ua);
    if (!result) {
      const reuse = await this.sessions.handlePotentialReuse(raw);
      const user = await this.userForRefresh(raw);
      clearAuthCookies(res, this.env, 'STUDENT');
      clearAuthCookies(res, this.env, 'STAFF');
      if (reuse && user) {
        await this.audit.record({ actorUserId: user.id, action: 'auth.refresh.reuse', result: 'DENIED', reasonCode: 'TOKEN_REUSE', ip, userAgent: ua });
      }
      throw AppError.sessionExpired();
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: result.userId } });
    const kind = user.kind;
    const access = this.tokens.signAccess({
      sub: user.id,
      kind,
      sid: result.issued.sessionId,
      aud: kind === 'STAFF' ? 'admin' : 'student',
      assurance: result.assurance,
    });
    setAuthCookies(res, this.env, kind, access, result.issued.refreshToken, result.remembered);
    return { ok: true };
  }

  async logout(req: Request & { auth?: { sub: string; sid: string; kind: 'STUDENT' | 'STAFF' } }, res: Response) {
    if (req.auth) {
      await this.sessions.revoke(req.auth.sid, req.auth.sub);
      clearAuthCookies(res, this.env, req.auth.kind);
    }
    return { ok: true };
  }

  async logoutAll(userId: string, kind: 'STUDENT' | 'STAFF', res: Response) {
    await this.sessions.revokeAll(userId);
    await this.trustedDevices.revokeAll(userId, 'logout-all');
    clearAuthCookies(res, this.env, kind);
    if (kind === 'STAFF') clearTrustedDeviceCookie(res, this.env);
    return { ok: true };
  }

  async me(userId: string, principalRoleKeys: string[], permissionCodes: string[], assurance: 'AAL1' | 'AAL2'): Promise<MeResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      userId: user.id,
      kind: user.kind,
      displayName: user.displayName,
      locale: (user.locale === 'en' ? 'en' : 'hi'),
      roleKeys: principalRoleKeys,
      permissionCodes,
      assurance,
      homeRoute: this.homeRouteFor(principalRoleKeys as RoleKey[]),
      orgId: user.orgId,
    };
  }

  async updateLocale(userId: string, locale: 'hi' | 'en'): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { locale } });
  }

  async getProfile(userId: string) {
    const u = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        staffProfile: true,
        studentProfile: true,
        org: {
          select: {
            id: true,
            name: true,
            accessCode: true,
            // Plan/billing is a staff (Academic Head) concern, not something a
            // student needs — the STAFF-only gate below is what actually keeps
            // it out of student profiles; this join runs either way since it's
            // cheap (at most one subscription per org).
            subscription: { include: { plan: true } },
          },
        },
      },
    });
    const sub = u.kind === 'STAFF' ? u.org?.subscription : null;
    return {
      kind: u.kind,
      displayName: u.displayName,
      email: u.email,
      phone: u.phone,
      fullName: u.staffProfile?.fullName ?? u.studentProfile?.fullName ?? null,
      title: u.staffProfile?.title ?? null,
      institution: u.org
        ? {
            id: u.org.id,
            name: u.org.name,
            accessCode: u.org.accessCode,
            plan: sub
              ? {
                  code: sub.plan.code,
                  nameHi: sub.plan.nameHi,
                  nameEn: sub.plan.nameEn,
                  status: sub.status,
                  billingCycle: sub.billingCycle,
                  currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
                  maxActiveStudents: sub.plan.maxActiveStudents,
                  maxStaffSeats: sub.plan.maxStaffSeats,
                  storageGb: sub.plan.storageGb,
                  internalFeeBps: sub.plan.internalFeeBps,
                  externalFeeBps: sub.plan.externalFeeBps,
                }
              : null,
          }
        : null,
      hasPassword: !!u.passwordHash,
      mfaEnabled: u.mfaEnabled,
    };
  }

  async updateProfile(userId: string, dto: { displayName?: string; fullName?: string; title?: string }) {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await this.prisma.$transaction(async (tx) => {
      if (dto.displayName !== undefined) {
        await tx.user.update({ where: { id: userId }, data: { displayName: dto.displayName } });
      }
      if (u.kind === 'STAFF' && (dto.fullName !== undefined || dto.title !== undefined)) {
        await tx.staffProfile.updateMany({
          where: { userId },
          data: { ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}), ...(dto.title !== undefined ? { title: dto.title } : {}) },
        });
      }
      if (u.kind === 'STUDENT' && dto.fullName !== undefined) {
        await tx.studentProfile.updateMany({ where: { userId }, data: { fullName: dto.fullName } });
      }
    });
    await this.audit.record({ actorUserId: userId, action: 'profile.update', result: 'SUCCESS' });
    return this.getProfile(userId);
  }

  // ── Self-service password reset (staff) ──────────────────────────────────────
  /** Always resolves successfully to avoid leaking whether an account exists. */
  async passwordForgot(workEmail: string, ip?: string): Promise<void> {
    const email = workEmail.toLowerCase();
    const user = await this.prisma.user.findFirst({ where: { kind: 'STAFF', email, deletedAt: null } });
    if (user) await this.otp.request(email, 'EMAIL', 'PASSWORD_RESET', ip);
  }

  async passwordReset(workEmail: string, code: string, password: string, ip?: string, userAgent?: string): Promise<void> {
    const email = workEmail.toLowerCase();
    await this.otp.verify(email, 'PASSWORD_RESET', code);
    const user = await this.prisma.user.findFirst({ where: { kind: 'STAFF', email, deletedAt: null } });
    if (!user) throw AppError.otpInvalid();
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, failedLogins: 0, lockedUntil: null },
    });
    await this.sessions.revokeAll(user.id);
    await this.trustedDevices.revokeAll(user.id);
    await this.notifications.emit({
      userId: user.id,
      category: 'SECURITY',
      titleHi: 'पासवर्ड बदला गया',
      titleEn: 'Password changed',
      bodyHi: 'आपके खाते का पासवर्ड बदल दिया गया है।',
      bodyEn: 'Your account password was changed.',
      email: (locale) => passwordChangedEmail(locale),
    });
    await this.audit.record({ actorUserId: user.id, action: 'auth.password_reset', result: 'SUCCESS', ip, userAgent });
  }

  // ── Google sign-in (student) ─────────────────────────────────────────────────
  googleConfigured(): boolean {
    return !!(this.env.GOOGLE_CLIENT_ID && this.env.GOOGLE_CLIENT_SECRET && this.env.GOOGLE_CALLBACK_URL);
  }

  googleAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.env.GOOGLE_CLIENT_ID,
      redirect_uri: this.env.GOOGLE_CALLBACK_URL,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /** Exchange the auth code, upsert the student, issue a session. Returns the home route. */
  async googleCallback(code: string, res: Response, ip?: string, userAgent?: string): Promise<string> {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.env.GOOGLE_CLIENT_ID,
        client_secret: this.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: this.env.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) throw AppError.invalidCredentials();
    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) throw AppError.invalidCredentials();

    const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${tokens.access_token}` },
    });
    if (!infoRes.ok) throw AppError.invalidCredentials();
    const info = (await infoRes.json()) as { sub?: string; email?: string; email_verified?: boolean; name?: string };
    if (!info.sub || !info.email) throw AppError.invalidCredentials();

    const email = info.email.toLowerCase();
    const identity = await this.prisma.userIdentity.findFirst({
      where: { provider: 'GOOGLE', providerUid: info.sub },
      include: { user: true },
    });
    let user = identity?.user ?? (await this.prisma.user.findFirst({ where: { kind: 'STUDENT', email } }));

    if (!user) {
      const studentRole = await this.prisma.role.findUniqueOrThrow({ where: { key: 'STUDENT' } });
      user = await this.prisma.user.create({
        data: {
          kind: 'STUDENT',
          status: 'ACTIVE',
          email,
          emailVerified: !!info.email_verified,
          displayName: info.name ?? null,
          identities: { create: { provider: 'GOOGLE', providerUid: info.sub } },
          studentProfile: { create: {} },
          roles: { create: { roleId: studentRole.id } },
        },
      });
    } else if (!identity) {
      await this.prisma.userIdentity.create({ data: { userId: user.id, provider: 'GOOGLE', providerUid: info.sub } });
    }

    await this.issue(res, user.id, 'STUDENT', 'AAL1', ip, userAgent);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.record({ actorUserId: user.id, action: 'auth.login.google', result: 'SUCCESS', ip, userAgent });
    return ROLE_HOME_ROUTE.STUDENT;
  }

  // ── helpers ────────────────────────────────────────────────────────────────
  private async issue(
    res: Response,
    userId: string,
    kind: 'STUDENT' | 'STAFF',
    assurance: 'AAL1' | 'AAL2',
    ip?: string,
    userAgent?: string,
    // Callers that don't pass this (student login has no "remember me" UI)
    // keep the existing always-persistent behavior; only staff login threads
    // the checkbox value through explicitly.
    remember = true,
  ): Promise<void> {
    const session = await this.sessions.create(userId, assurance, ip, userAgent, undefined, remember);
    const access = this.tokens.signAccess({
      sub: userId,
      kind,
      sid: session.sessionId,
      aud: kind === 'STAFF' ? 'admin' : 'student',
      assurance,
    });
    setAuthCookies(res, this.env, kind, access, session.refreshToken, remember);
  }

  private homeRouteFor(roleKeys: RoleKey[]): string {
    for (const key of ROLE_PRIORITY) {
      if (roleKeys.includes(key)) return ROLE_HOME_ROUTE[key];
    }
    return ROLE_HOME_ROUTE.STUDENT;
  }

  private async userForRefresh(raw: string) {
    const { sha256 } = await import('../common/crypto.util');
    const session = await this.prisma.loginSession.findUnique({ where: { refreshTokenHash: sha256(raw) } });
    if (!session) return null;
    return this.prisma.user.findUnique({ where: { id: session.userId } });
  }
}
