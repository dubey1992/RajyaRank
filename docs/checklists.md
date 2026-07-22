# QA, Security & Production-Launch Checklists

## Security checklist (Phase 1 status)
- [x] Argon2id password hashing
- [x] HttpOnly, SameSite, Secure (prod) session cookies; audience-scoped access token
- [x] Refresh-token rotation + reuse detection (family revoke)
- [x] Server-side RBAC + assignment-scope enforcement on every protected endpoint
- [x] Denied protected request → 403 `PERMISSION_DENIED` + append-only audit event
- [x] OTP attempt limits + login rate limiting + account lockout
- [x] TOTP MFA for high-risk roles; AAL2 required for high-risk permissions
- [x] Secrets from env only; TOTP secrets encrypted; audit stores no secrets
- [x] Zod input validation on all write endpoints; helmet headers; CORS allow-list
- [x] Append-only audit (DB trigger) + partial-unique verified email/phone
- [x] Signed short-lived URLs for uploads/playback; per-user watermark; concurrent-session cap
- [x] Payment/webhook HMAC signature verification + idempotent webhooks (Phase 6)
- [x] Web/admin security headers (CSP, HSTS, X-Frame-Options, nosniff, Referrer/Permissions-Policy)
- [x] `/metrics`, `/healthz`, `/readyz`, correlation-id structured logging; Sentry hook (`SENTRY_DSN`)
- [x] Dependency scan step in CI (`pnpm audit`); backup/restore procedure documented
- [ ] Malware scanning on upload-complete (worker) — tracked
- [ ] Nonce-based CSP (drop `'unsafe-inline'` scripts) — tracked
- [ ] Container image scanning + external pen-test — pre-launch

## QA checklist (per feature)
- [ ] Loading / empty / error / permission-denied / offline states present
- [ ] Bilingual EN + HI; locale persists; no machine translation; Devanagari renders
- [ ] Backend validation + server-side authorization (not just UI hiding)
- [ ] Audit events for sensitive actions
- [ ] Unit + integration tests; critical flows in e2e; CI green (lint/typecheck/build/test/i18n)
- [ ] Mobile-first at 360px; keyboard navigable; visible focus; AA contrast
- [ ] No hardcoded roles/prices; no mock payment success; no exposed protected URLs

## Production-launch checklist
- [ ] Separate dev/staging/prod env + secrets (no shared prod credentials)
- [ ] `COOKIE_SECURE=true`, real `FIELD_ENCRYPTION_KEY` (KMS), real SMS/OAuth/SMTP providers
- [ ] Migrations applied incl. `constraints.sql`; seed = reference data only (no demo users)
- [ ] Health checks wired to orchestrator; structured logs + error tracking + metrics
- [ ] Automated daily backups + tested point-in-time restore
- [ ] Rate-limit/lockout thresholds reviewed; brand/domain/trademark cleared
- [ ] Accessibility + performance (Core Web Vitals) review; PWA installability
