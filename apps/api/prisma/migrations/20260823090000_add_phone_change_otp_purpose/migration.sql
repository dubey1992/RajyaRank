-- Self-service phone number change is OTP-verified (see AuthService.
-- requestPhoneChange/confirmPhoneChange) — needs its own OtpChallenge
-- purpose, distinct from STUDENT_LOGIN, so a phone-change code can't be
-- replayed as a login code or vice versa.
ALTER TYPE "OtpPurpose" ADD VALUE 'PHONE_CHANGE';
