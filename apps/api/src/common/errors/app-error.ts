import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '@rajyarank/contracts';

/**
 * Domain error carrying a stable machine-readable code. The exception filter
 * renders it into the standard error envelope. Human-facing text is a safe
 * default; clients localize by `code`.
 */
export class AppError extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    status: HttpStatus,
    message: string,
    public readonly fieldErrors?: { path: string; message: string }[],
  ) {
    super({ code, message, fieldErrors }, status);
  }

  static permissionDenied(message = 'You do not have permission to perform this action.') {
    return new AppError('PERMISSION_DENIED', HttpStatus.FORBIDDEN, message);
  }
  static invalidCredentials() {
    return new AppError('AUTH_INVALID_CREDENTIALS', HttpStatus.UNAUTHORIZED, 'Incorrect credentials.');
  }
  static accountLocked() {
    return new AppError('ACCOUNT_LOCKED', HttpStatus.TOO_MANY_REQUESTS, 'Account temporarily locked.');
  }
  static accountDisabled() {
    return new AppError('ACCOUNT_DISABLED', HttpStatus.FORBIDDEN, 'This account is not active.');
  }
  static mfaRequired() {
    return new AppError('AUTH_MFA_REQUIRED', HttpStatus.UNAUTHORIZED, 'Two-factor authentication required.');
  }
  static mfaInvalid() {
    return new AppError('AUTH_MFA_INVALID', HttpStatus.UNAUTHORIZED, 'Invalid authenticator code.');
  }
  static sessionExpired() {
    return new AppError('AUTH_INVALID_CREDENTIALS', HttpStatus.UNAUTHORIZED, 'Session expired. Please sign in again.');
  }
  static otpInvalid() {
    return new AppError('AUTH_OTP_INVALID', HttpStatus.BAD_REQUEST, 'Invalid verification code.');
  }
  static otpExpired() {
    return new AppError('AUTH_OTP_EXPIRED', HttpStatus.BAD_REQUEST, 'Verification code expired.');
  }
  static otpTooManyAttempts() {
    return new AppError('AUTH_OTP_TOO_MANY_ATTEMPTS', HttpStatus.TOO_MANY_REQUESTS, 'Too many attempts.');
  }
  static invitationInvalid() {
    return new AppError('INVITATION_INVALID', HttpStatus.BAD_REQUEST, 'Invalid invitation.');
  }
  static invitationExpired() {
    return new AppError('INVITATION_EXPIRED', HttpStatus.GONE, 'This invitation has expired.');
  }
  static notFound(message = 'Not found.') {
    return new AppError('NOT_FOUND', HttpStatus.NOT_FOUND, message);
  }
  static contentStateInvalid(message = 'This action is not allowed in the current content state.') {
    return new AppError('CONTENT_STATE_INVALID', HttpStatus.CONFLICT, message);
  }
  static versionConflict(message = 'The content changed since you loaded it. Reload and retry.') {
    return new AppError('CONTENT_VERSION_CONFLICT', HttpStatus.CONFLICT, message);
  }
  static assetNotReady(message = 'The linked asset is not ready.') {
    return new AppError('ASSET_NOT_READY', HttpStatus.CONFLICT, message);
  }
  static entitlementRequired(message = 'You need to enrol in this course to access it.') {
    return new AppError('ENTITLEMENT_REQUIRED', HttpStatus.PAYMENT_REQUIRED, message);
  }
  static paymentSignatureInvalid(message = 'Payment could not be verified.') {
    return new AppError('PAYMENT_SIGNATURE_INVALID', HttpStatus.BAD_REQUEST, message);
  }
  static couponInvalid(message = 'This coupon cannot be applied.') {
    return new AppError('COUPON_INVALID', HttpStatus.CONFLICT, message);
  }
  static conflict(message = 'Conflict.') {
    return new AppError('CONFLICT', HttpStatus.CONFLICT, message);
  }
}
