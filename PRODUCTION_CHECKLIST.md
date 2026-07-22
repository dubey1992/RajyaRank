# Production Deployment Checklist

Production is only ever deployed after you have completed `STAGING_CHECKLIST.md` in full **and**
typed the exact phrase `APPROVE PRODUCTION DEPLOYMENT`. This checklist has two parts: things to
confirm **before** deploying, and things to verify **after**.

## Before deploying

- [ ] Every item in `STAGING_CHECKLIST.md` passed on staging
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass
- [ ] A database backup / recovery point has been taken (see `ROLLBACK.md`)
- [ ] Production is confirmed to use: the `main` branch, the `production` database, the
      `production` storage bucket, **Razorpay Live Mode** keys, and production-only secrets —
      never anything copied from staging
- [ ] The production Razorpay webhook URL is configured and points at the production API
- [ ] You have typed the exact phrase `APPROVE PRODUCTION DEPLOYMENT`

## After deploying

- [ ] `GET /healthz` returns healthy on the production API
- [ ] `GET /readyz` returns healthy on the production API
- [ ] The production frontend loads
- [ ] Login works (staff and student)
- [ ] A real, low-value payment test is performed **only after asking you for confirmation first**
      (see `PHASE 6` in the original deployment plan — this step is never automatic)
- [ ] The payment webhook fires and is processed correctly in production
- [ ] Entitlement/access is granted correctly after a real payment
- [ ] Logs contain no secret values
- [ ] The exact deployed commit / image tag is recorded (needed for rollback — see `ROLLBACK.md`)

## If anything fails after a production deploy

Follow `ROLLBACK.md` immediately — don't attempt to "fix forward" under pressure with real users
potentially affected. Roll back first, diagnose calmly afterward, then redeploy once fixed and
re-verified on staging.
