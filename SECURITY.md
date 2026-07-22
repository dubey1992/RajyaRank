# Security

## Reporting
Email security@rajyarank.in (or the private security contact). Do not open public issues for
vulnerabilities. We aim to acknowledge within 48 hours.

## Controls implemented
- **AuthN:** argon2id passwords; phone OTP (hashed, attempt-capped, TTL); TOTP MFA for high-risk staff;
  HttpOnly + Secure + SameSite cookies; audience-scoped access tokens (student token unusable on admin).
- **Sessions:** short access JWT + rotating refresh with **reuse detection** (family revoke),
  logout-all, **concurrent-session cap** (`MAX_CONCURRENT_SESSIONS`), rate limiting + account lockout.
- **AuthZ:** central fail-closed policy engine — role capability + assignment scope + ownership +
  content status + session assurance. Every protected endpoint enforced server-side; denial → HTTP 403
  `PERMISSION_DENIED` + append-only audit event. ESLint rule forbids role-name comparisons.
- **Input:** zod validation on all writes; stable machine error codes.
- **Web headers:** CSP, HSTS, X-Content-Type-Options, X-Frame-Options (admin DENY, web SAMEORIGIN),
  Referrer-Policy, Permissions-Policy; admin is `noindex`. Helmet on the API.
- **Payments:** backend-created orders; **HMAC** signature + **webhook** verification (raw body);
  idempotent webhooks (unique event id); frontend callback never trusted; access via entitlements only.
- **Content protection:** private S3; short-lived **signed** playback/view URLs; per-user watermark;
  no permanent public URLs; concurrent-session limits.
- **Secrets:** env-only, per-tier; TOTP secrets AES-256-GCM encrypted; audit never stores
  passwords/OTPs/tokens/full payment data.
- **Data:** append-only `audit_logs` (DB trigger); partial-unique verified email/phone; soft-delete;
  FKs; idempotency keys on orders/webhooks.

## Threat model (highlights)
| Threat | Mitigation |
|---|---|
| Privilege escalation / IDOR | central policy engine + ownership + scope on every endpoint; 403 + audit |
| Token theft / replay | refresh rotation + reuse-detection; short access TTL; audience claim |
| Payment tampering | server-side HMAC + webhook verify; entitlement only from verified payment |
| Brute force / OTP abuse | rate limits, lockout, OTP attempt cap |
| Content leakage | signed expiring URLs, entitlement gate, watermark, session cap |
| XSS / clickjacking | CSP, frame-ancestors, nosniff, input validation, React escaping |
| Webhook replay | unique provider event id (idempotent) |

## Follow-ups (tracked)
- Nonce-based CSP (remove `'unsafe-inline'` for scripts).
- File malware scanning on upload-complete (worker step).
- Dependency + container scanning in CI (`pnpm audit`, image scan) — see `.github/workflows`.
- Pen-test for IDOR / role-escalation / upload abuse / webhook replay before public launch.
