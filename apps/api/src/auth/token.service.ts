import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ENV } from '../config/config.module';
import type { ApiEnv } from '@rajyarank/config/env';

export interface AccessClaims {
  sub: string;
  kind: 'STUDENT' | 'STAFF';
  sid: string; // session id
  aud: 'student' | 'admin';
  assurance: 'AAL1' | 'AAL2';
}

/** Signs/verifies short-lived access tokens. Refresh tokens are opaque and
 *  stored (hashed) as sessions — see SessionService. */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(ENV) private readonly env: ApiEnv,
  ) {}

  signAccess(claims: AccessClaims): string {
    return this.jwt.sign(claims, {
      secret: this.env.JWT_ACCESS_SECRET,
      expiresIn: this.env.ACCESS_TOKEN_TTL,
    });
  }

  verifyAccess(token: string): AccessClaims {
    return this.jwt.verify<AccessClaims>(token, { secret: this.env.JWT_ACCESS_SECRET });
  }

  /** Short-lived token bridging staff login → MFA verify (AAL1 → AAL2). Carries
   *  the "remember me" choice made at login so it survives the MFA hop without
   *  trusting a client-resubmitted value. */
  signMfaChallenge(userId: string, remember: boolean): string {
    return this.jwt.sign({ sub: userId, purpose: 'staff-mfa', remember }, {
      secret: this.env.JWT_ACCESS_SECRET,
      expiresIn: 300,
    });
  }

  verifyMfaChallenge(token: string): { sub: string; remember: boolean } {
    const payload = this.jwt.verify<{ sub: string; purpose: string; remember?: boolean }>(token, {
      secret: this.env.JWT_ACCESS_SECRET,
    });
    if (payload.purpose !== 'staff-mfa') throw new Error('Invalid MFA token');
    return { sub: payload.sub, remember: payload.remember ?? false };
  }

  /** Short-lived token behind the Course Studio's "Open student preview" —
   *  scoped to one course, expires in 10 minutes, never grants any write access. */
  signCoursePreview(courseId: string, issuedBy: string): string {
    return this.jwt.sign({ sub: issuedBy, purpose: 'course-preview', courseId }, {
      secret: this.env.JWT_ACCESS_SECRET,
      expiresIn: 600,
    });
  }

  verifyCoursePreview(token: string): { courseId: string; issuedBy: string } {
    const payload = this.jwt.verify<{ sub: string; purpose: string; courseId?: string }>(token, {
      secret: this.env.JWT_ACCESS_SECRET,
    });
    if (payload.purpose !== 'course-preview' || !payload.courseId) throw new Error('Invalid preview token');
    return { courseId: payload.courseId, issuedBy: payload.sub };
  }
}
