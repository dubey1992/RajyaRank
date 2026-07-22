# Environments & Deployment

Four tiers, each fully isolated (no shared secrets or data). `NODE_ENV=production` for staging/
preprod/prod (real optimisations); the tier is distinguished by **`APP_ENV`**.

## URL matrix

| Tier | `APP_ENV` | Student web | Admin portal | API |
|------|-----------|-------------|--------------|-----|
| Local | `local` | http://localhost:3000 | http://localhost:3001 | http://localhost:4000 |
| Staging | `staging` | https://staging.rajyarank.in | https://admin.staging.rajyarank.in | https://api.staging.rajyarank.in |
| Pre-production (UAT) | `preproduction` | https://preprod.rajyarank.in | https://admin.preprod.rajyarank.in | https://api.preprod.rajyarank.in |
| Production | `production` | https://rajyarank.in | https://admin.rajyarank.in | https://api.rajyarank.in |

Env templates: `.env.example` (local), `.env.staging.example`, `.env.preproduction.example`,
`.env.production.example`. Copy the right one to `.env` on the host / into the CI secret store and
fill secrets from the secret manager — **never commit real values**.

Cookies use a shared parent domain per tier (e.g. `.staging.rajyarank.in`) so the student and admin
subdomains share the auth realm; `COOKIE_SECURE=true` everywhere except local. CORS is driven by
`WEB_PUBLIC_URL` + `ADMIN_PUBLIC_URL` (see `apps/api/src/main.ts`).

## Promotion flow

```
feature branch → PR (CI: lint, typecheck, build, unit, integration)
   → main → auto-deploy Staging
   → manual promote → Pre-production (UAT: acceptance + load + security tests)
   → manual promote (approval) → Production
```
Razorpay stays in **test mode** through preprod; **live keys only in production**.

## Deploy steps (per tier)

```bash
# 1. Provision managed Postgres + Redis + private S3 bucket; set secrets.
# 2. Apply migrations (never `migrate dev` in shared envs):
pnpm --filter @rajyarank/api prisma migrate deploy
psql "$DATABASE_URL" -f apps/api/prisma/constraints.sql   # first deploy only
# 3. Seed reference data only (prod seed inserts NO demo users):
NODE_ENV=production pnpm --filter @rajyarank/api prisma db seed
# 4. Build + start each service (containerised):
pnpm build
#   api:  node apps/api/dist/main.js         (health: /healthz, /readyz)
#   worker: node apps/worker/dist/main.js
#   web/admin: next start
# 5. Point the Razorpay webhook at  https://api.<tier>.rajyarank.in/api/v1/webhooks/razorpay
```

## Rollback

- App: redeploy the previous image tag (stateless API/worker/web).
- DB: migrations are forward-only; keep a pre-deploy snapshot and use point-in-time restore for a
  bad migration. Never hand-edit prod data outside a reviewed migration.

## Health & monitoring

`/healthz` (liveness) and `/readyz` (db + redis) on the API; wire both to the orchestrator.
Structured JSON logs carry a correlation id; ship to the log platform + error tracker per tier.
