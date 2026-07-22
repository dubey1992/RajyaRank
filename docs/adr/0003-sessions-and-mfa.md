# ADR 0003 — Sessions, tokens, and MFA

**Status:** Accepted (2026-07-13)

## Decision
- Short-lived **access JWT** (~10 min) in an HttpOnly, SameSite=Lax, Secure (prod) cookie; carries an
  audience (`kind`) so a student token cannot be replayed on the admin app.
- Opaque **refresh token** (~30 days), stored only as a SHA-256 hash in `login_sessions`, **rotated on
  every use**. Each session belongs to a `familyId`; presenting an already-rotated token (reuse)
  revokes the entire family — a theft signal.
- **TOTP MFA** for high-risk staff; secrets AES-256-GCM encrypted with a per-env key (KMS in prod).
  Login returns `MFA_REQUIRED` + a 5-minute challenge token; verifying it mints an **AAL2** session.
- High-risk permissions require AAL2 even for Super Admin.
- Rate limiting on OTP/login + account lockout after repeated failures.

## Consequences
Refresh rotation + reuse detection needs careful storage and is covered by integration tests. Access
tokens are not revocable within their short TTL; sensitive changes bump `permVersion` and revoke
sessions so effect is near-immediate.
