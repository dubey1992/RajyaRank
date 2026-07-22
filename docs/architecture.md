# Architecture

## System context

```
Students ──► apps/web  (Next.js, SSR/SEO, PWA) ─┐
                                                 ├─► apps/api (NestJS REST /api/v1) ─► PostgreSQL (Prisma)
Staff    ──► apps/admin (Next.js, no-index) ────┘                                  ├─► Redis (cache/sessions/rate-limit/queues)
                                                    apps/worker ◄── Redis queues ──┘   └─► S3 (MinIO) private storage
                                                    (email/SMS send, scheduled sweeps)      (assets — Phase 2+)
```

Frontends talk to the API over cookies (HttpOnly). The API is stateless and horizontally scalable;
sessions live in Postgres (refresh) + short-lived JWT access cookies. The worker consumes Redis-list
queues the API produces and runs scheduled maintenance.

## Backend module boundaries (`apps/api/src`)

- `config` — zod-validated env (fail-fast at boot).
- `common` — response envelope, exception filter + stable error codes, zod validation pipe,
  correlation-id middleware, crypto utilities, decorators.
- `prisma`, `redis` — infra services (global).
- `audit` — append-only writer (DB trigger enforces immutability).
- `authz` — **central authorization**: `AuthorizationService` builds/caches the `Principal` and calls
  the pure engine in `packages/auth`; `PermissionsGuard` + decorators enforce it.
- `auth` — token service (JWT access), session service (opaque rotating refresh + reuse-detection),
  OTP, MFA (TOTP), cookies, global `AccessGuard`, student + staff flows.
- `notifications` — provider-agnostic notifier → Redis queues (worker delivers).
- `invitations`, `staff-admin`, `catalogue`, `content` (stub), `health`.

## Security model

- **AuthN:** `AccessGuard` (global) verifies the access JWT (audience-scoped by `kind` so a student
  token can't be used on admin), resolves the `Principal`, attaches it to the request. `@Public`
  opts out.
- **AuthZ:** deterministic fail-closed engine — account active → Super Admin override (still honors
  AAL2) → permission code → assurance → ownership → content status → assignment scope. One decision
  point; no scattered role checks (enforced by an ESLint rule).
- **Sessions:** access ~10 min; refresh ~30 days, rotated on every use; reuse of a rotated token
  revokes the whole family. Logout-all + per-session revoke.
- **Abuse controls:** per-destination/IP OTP rate limits, login lockout, global throttler.
- **Secrets:** env-only; TOTP secrets AES-256-GCM encrypted with a per-env key; audit never stores
  passwords/OTPs/tokens.

## Data & migrations

Prisma schema in `apps/api/prisma/schema.prisma`. Raw SQL Prisma can't express lives in
`constraints.sql`: partial-unique verified email/phone, one-active-assignment index, and the
`audit_logs` append-only trigger. `StaffAssignment.courseId/subjectId/batchId` are nullable UUIDs now
and become foreign keys in Phase 2.

## Frontend

App Router with a `[locale]` segment (`hi` default, `en`). Locale is chosen explicitly (cookie /
`User.locale`), never from `Accept-Language`; `<html translate="no">` disables browser translation.
Shared design system in `packages/ui` (tokens + Tailwind preset + Devanagari font stack). Every
screen provides loading / empty / error / permission-denied / offline states.
