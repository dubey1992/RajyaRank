# Security Checklist

An honest record of what's already handled well, what's a known gap, and what must happen before
production goes live. This is a living document — update it whenever the security posture changes.

## Already in good shape (confirmed by reading the actual code, not assumed)

- **Webhook verification**: the Razorpay webhook signature is verified using HMAC-SHA256 with a
  constant-time comparison (`timingSafeEqual`) — resistant to timing attacks. Verification uses the
  **raw request body**, not a re-serialized/parsed version (required for the signature to match).
- **Webhook idempotency**: incoming Razorpay events are recorded with a unique constraint on the
  provider's event ID — processing the same webhook twice is a safe no-op, not a duplicate charge
  or duplicate entitlement.
- **Payment confirmation happens server-side.** The frontend reporting "payment succeeded" is never
  sufficient on its own — the backend independently verifies the payment signature before granting
  any entitlement.
- **Secrets fail fast.** The API validates every required environment variable at startup (via a
  strict schema) and refuses to start with a clear error message if anything required is missing —
  it will never silently fall back to an insecure default in a real deployment.
- **CORS is not wildcard.** Allowed origins are explicitly limited to the configured student and
  admin site URLs, not `*`.
- **Passwords/secrets are never logged.** Structured logging redacts `Authorization` and `Cookie`
  headers.
- **`.dockerignore` already excludes** `.env` and all `.env.*` files (except `.env.example`) from
  ever being baked into a container image.
- **Role-based access control (RBAC)** is centrally enforced by a single policy engine, not
  scattered per-endpoint checks — confirmed by a genuine, passing 17-test suite covering scope
  rules, step-up authentication (2FA) requirements, and Super Admin's intentionally limited scope.

## Fixed during Phase 1 preparation

- **Git history exposure**: `.env` files were previously tracked in the connected GitHub
  repository's history (a public repository). All secrets that were ever committed must be treated
  as compromised — see the "Secret rotation" section below. A complete `.gitignore` now prevents
  this going forward.
- **Missing `.gitignore`** (only excluded `node_modules` before) — now excludes secrets, build
  output, logs, IDE files, and more.
- **ESLint had no working configuration** in this repository — `pnpm lint` was silently ignored in
  CI (`continue-on-error: true`). Real, working configuration now exists for every package, and all
  real issues it found have been fixed (not suppressed).
- **The production build command didn't actually match what gets deployed** — `pnpm build` on the
  API produced files in the wrong location for `pnpm start` to find, meaning the plain (non-Docker)
  production path was silently broken. Fixed so both paths are consistent.
- **The API's test script itself would not run at all** (a broken command trying to execute a shell
  script through the Node interpreter). Fixed — the real test suite (26 tests) now runs and passes.

## Known, deliberate gaps — not yet production-ready

- **Malware/virus scanning on uploaded files** (`ASSET_SCAN_PROVIDER`) only has a "basic" checked-in
  implementation; ClamAV/external scanning is accepted as a config value but not yet wired to a real
  scanner. Treat all uploads as scanned-but-not-guaranteed-clean until this is addressed.
- **SMS provider integration** (MSG91/Twilio) is scaffolded in configuration but not fully
  implemented — only the `log` (print to console) provider works today. Needed before real OTP SMS
  can be sent in production.
- **Next.js-specific lint rules** (e.g. React hooks correctness rules) are not yet enforced — the
  current ESLint setup catches general TypeScript issues but not framework-specific ones, due to a
  real version incompatibility between this project's ESLint version and the available Next.js lint
  plugin. Not a blocker, but a known gap to revisit later.
- **Automated test coverage is real but limited** — 26 passing tests today, concentrated on the
  permission/authorization engine and one scoring function. Most user flows are currently verified
  by hand (see the checklists) rather than by automated regression tests.

## Secret rotation plan (required before any real production traffic)

Because we don't know with certainty which values in the exposed Git history were real vs.
placeholder, the safe approach is to **treat all of them as compromised** and generate entirely new
values for every environment:

- [ ] `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — generate fresh, never reuse
- [ ] `FIELD_ENCRYPTION_KEY` — generate fresh, never reuse
- [ ] Database password — generate fresh when the staging/production database is created
- [ ] `S3_ACCESS_KEY` / `S3_SECRET_KEY` — generate fresh AWS credentials, scoped narrowly (see
      Phase 4 — least-privilege IAM)
- [ ] `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` — use fresh Test Mode keys for staging;
      fresh Live Mode keys for production, generated directly in the Razorpay dashboard
- [ ] `SMTP_PASS` — rotate if a real email account/password was ever used locally
- [ ] Any Google OAuth client secret, if one was ever configured

None of these are stored anywhere in this repository going forward — only in AWS Secrets Manager
and GitHub encrypted secrets, per the deployment plan.
