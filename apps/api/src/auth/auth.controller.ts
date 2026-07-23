import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import type { Principal } from '@rajyarank/auth';
import type { ApiEnv } from '@rajyarank/config/env';
import {
  changePasswordSchema,
  passwordForgotSchema,
  passwordResetSchema,
  staffLoginSchema,
  staffMfaVerifySchema,
  studentLoginSchema,
  studentOtpRequestSchema,
  studentOtpVerifySchema,
  studentPasswordForgotSchema,
  studentPasswordResetSchema,
  studentSignupRequestSchema,
  studentSignupVerifySchema,
  updateLocaleSchema,
  updateProfileSchema,
  type ChangePassword,
  type UpdateProfile,
} from '@rajyarank/contracts';
import { ENV } from '../config/config.module';
import { Public } from '../common/decorators/public.decorator';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { TrustedDeviceService } from './trusted-device.service';
import { MfaService } from './mfa.service';
import { TRUSTED_DEVICE_COOKIE } from './cookies';
import { sha256 } from '../common/crypto.util';
import type { AccessClaims } from './token.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly trustedDevices: TrustedDeviceService,
    private readonly mfa: MfaService,
    @Inject(ENV) private readonly env: ApiEnv,
  ) {}

  // ── MFA enrollment (authenticated; used after invitation accept) ──
  @Post('mfa/enroll')
  async enrollMfa(@CurrentPrincipal() principal: Principal) {
    return this.mfa.enroll(principal.userId, `staff:${principal.userId}`);
  }

  @Post('mfa/confirm')
  async confirmMfa(
    @CurrentPrincipal() principal: Principal,
    @Body() body: { code: string },
  ) {
    const ok = await this.mfa.confirmEnrollment(principal.userId, body.code ?? '');
    return { confirmed: ok };
  }

  // ── Student ──
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('student/otp/request')
  async studentOtpRequest(
    @Body(new ZodValidationPipe(studentOtpRequestSchema)) body: { phone: string },
    @Req() req: Request,
  ) {
    const { expiresInSeconds } = await this.auth.studentOtpRequest(body.phone, req.ip);
    return { requested: true, expiresInSeconds };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('student/otp/verify')
  async studentOtpVerify(
    @Body(new ZodValidationPipe(studentOtpVerifySchema)) body: { phone: string; code: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.studentOtpVerify(body.phone, body.code, res, req.ip, req.header('user-agent') ?? undefined);
  }

  // ── Student email + password ──
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('student/signup/request')
  async studentSignupRequest(
    @Body(new ZodValidationPipe(studentSignupRequestSchema)) body: { email: string },
    @Req() req: Request,
  ) {
    await this.auth.studentSignupRequest(body.email, req.ip);
    return { requested: true };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('student/signup/verify')
  async studentSignupVerify(
    @Body(new ZodValidationPipe(studentSignupVerifySchema)) body: { email: string; code: string; password: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.studentSignupVerify(body.email, body.code, body.password, res, req.ip, req.header('user-agent') ?? undefined);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('student/login')
  async studentLogin(
    @Body(new ZodValidationPipe(studentLoginSchema)) body: { email: string; password: string; remember?: boolean },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.studentLogin(body.email, body.password, res, req.ip, req.header('user-agent') ?? undefined, body.remember ?? false);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('student/password/forgot')
  async studentPasswordForgot(
    @Body(new ZodValidationPipe(studentPasswordForgotSchema)) body: { email: string },
    @Req() req: Request,
  ) {
    await this.auth.studentPasswordForgot(body.email, req.ip);
    return { requested: true };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('student/password/reset')
  async studentPasswordReset(
    @Body(new ZodValidationPipe(studentPasswordResetSchema)) body: { email: string; code: string; password: string },
    @Req() req: Request,
  ) {
    await this.auth.studentPasswordReset(body.email, body.code, body.password, req.ip, req.header('user-agent') ?? undefined);
    return { reset: true };
  }

  // ── Student Google sign-in ──
  @Public()
  @Get('student/google/start')
  googleStart(@Res() res: Response) {
    if (!this.auth.googleConfigured()) {
      return res.redirect(`${this.env.WEB_PUBLIC_URL}/hi/login?error=google_unavailable`);
    }
    const state = randomUUID();
    res.cookie('rr_oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.env.COOKIE_SECURE,
      maxAge: 600_000,
      path: '/',
    });
    return res.redirect(this.auth.googleAuthUrl(state));
  }

  @Public()
  @Get('student/google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const webBase = this.env.WEB_PUBLIC_URL;
    const cookieState = (req.cookies as Record<string, string> | undefined)?.['rr_oauth_state'];
    if (!code || !state || !cookieState || state !== cookieState) {
      return res.redirect(`${webBase}/hi/login?error=google_failed`);
    }
    res.clearCookie('rr_oauth_state', { path: '/' });
    try {
      const home = await this.auth.googleCallback(code, res, req.ip, req.header('user-agent') ?? undefined);
      return res.redirect(`${webBase}/hi${home}`);
    } catch {
      return res.redirect(`${webBase}/hi/login?error=google_failed`);
    }
  }

  // ── Staff password reset ──
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('staff/password/forgot')
  async passwordForgot(
    @Body(new ZodValidationPipe(passwordForgotSchema)) body: { workEmail: string },
    @Req() req: Request,
  ) {
    await this.auth.passwordForgot(body.workEmail, req.ip);
    return { requested: true };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('staff/password/reset')
  async passwordReset(
    @Body(new ZodValidationPipe(passwordResetSchema)) body: { workEmail: string; code: string; password: string },
    @Req() req: Request,
  ) {
    await this.auth.passwordReset(body.workEmail, body.code, body.password, req.ip, req.header('user-agent') ?? undefined);
    return { reset: true };
  }

  // ── Staff ──
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('staff/login')
  async staffLogin(
    @Body(new ZodValidationPipe(staffLoginSchema)) body: { workEmail: string; password: string; remember?: boolean },
    @Req() req: Request & { cookies?: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.staffLogin(
      body.workEmail,
      body.password,
      res,
      req.ip,
      req.header('user-agent') ?? undefined,
      body.remember ?? false,
      req.cookies?.[TRUSTED_DEVICE_COOKIE],
    );
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('staff/mfa/verify')
  async staffMfaVerify(
    @Body(new ZodValidationPipe(staffMfaVerifySchema)) body: { mfaToken: string; totp: string; trustDevice?: boolean },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.staffMfaVerify(
      body.mfaToken,
      body.totp,
      res,
      req.ip,
      req.header('user-agent') ?? undefined,
      body.trustDevice ?? false,
    );
  }

  // ── Session lifecycle ──
  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.refresh(req, res);
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.logout(req as Request & { auth?: AccessClaims }, res);
  }

  @Post('logout-all')
  async logoutAll(
    @CurrentPrincipal() principal: Principal,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.logoutAll(principal.userId, principal.kind, res);
  }

  @Get('me')
  async me(@CurrentPrincipal() principal: Principal, @Req() req: Request & { auth?: AccessClaims }) {
    return this.auth.me(
      principal.userId,
      principal.roleKeys,
      [...principal.permissionCodes],
      req.auth?.assurance ?? 'AAL1',
    );
  }

  @Get('sessions')
  async listSessions(@CurrentPrincipal() principal: Principal, @Req() req: Request & { auth?: AccessClaims }) {
    return this.sessions.list(principal.userId, req.auth?.sid);
  }

  @Delete('sessions/:id')
  async revokeSession(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    await this.sessions.revoke(id, principal.userId);
    return { revoked: true };
  }

  @Get('trusted-devices')
  async listTrustedDevices(@CurrentPrincipal() principal: Principal, @Req() req: Request & { cookies?: Record<string, string> }) {
    const raw = req.cookies?.[TRUSTED_DEVICE_COOKIE];
    return this.trustedDevices.list(principal.userId, raw ? sha256(raw) : undefined);
  }

  @Delete('trusted-devices/:id')
  async revokeTrustedDevice(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    await this.trustedDevices.revoke(id, principal.userId);
    return { revoked: true };
  }

  @Post('locale')
  async setLocale(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(updateLocaleSchema)) body: { locale: 'hi' | 'en' },
  ) {
    await this.auth.updateLocale(principal.userId, body.locale);
    return { locale: body.locale };
  }

  @Get('me/profile')
  getProfile(@CurrentPrincipal() principal: Principal) {
    return this.auth.getProfile(principal.userId);
  }

  @Patch('me/profile')
  updateProfile(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfile,
  ) {
    return this.auth.updateProfile(principal.userId, body);
  }

  @Patch('me/password')
  async changePassword(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePassword,
    @Req() req: Request,
  ) {
    await this.auth.changePassword(principal.userId, body.currentPassword, body.newPassword, req.ip, req.header('user-agent') ?? undefined);
    return { changed: true };
  }
}
