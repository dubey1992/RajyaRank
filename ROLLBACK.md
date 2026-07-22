# Rollback Guide

How to undo a bad deployment, quickly and safely. Read this calmly even during an incident —
rolling back is a normal, safe, reversible action, not a last resort.

> This file will gain exact commands (with real service names) once Phase 5/6 deployment is
> complete. The approach described below is the plan this project follows.

## The general idea

Every deployment produces a new, uniquely-tagged, immutable version (a container image tagged with
the Git commit it was built from, for the API/worker; a numbered build for the web/admin apps).
"Rolling back" means telling the system to run the *previous* version again — it does not require
writing new code, reverting commits, or rebuilding anything from source.

## Rolling back the API / worker (containers)

1. Find the previous working image tag (recorded in `PRODUCTION_DEPLOYMENT_REPORT.md` or the
   deployment history in GitHub Actions).
2. Re-run the deployment workflow, pointing it at that older tag instead of building fresh.
3. Confirm `GET /healthz` and `GET /readyz` are healthy on the rolled-back version.

## Rolling back the student site / admin portal (frontend)

Frontend hosting keeps a history of previous deployments. Rolling back means selecting the previous
successful deployment and redirecting traffic to it — typically a few clicks, no rebuild needed.

## Rolling back a database change

**Database migrations are forward-only** — there is no automatic "undo" for a schema change, the
same way there's no automatic undo for a container image. This is why a backup/recovery point is
always taken immediately before applying any production migration (see `PRODUCTION_CHECKLIST.md`).

If a migration causes a problem:
1. **Do not** attempt to hand-write a reverse migration under pressure.
2. Restore the database to the pre-migration recovery point.
3. Redeploy the previous (pre-migration) application version so the code matches the restored
   database shape.
4. Diagnose what went wrong with the migration calmly, fix it, and re-verify on staging before
   trying again in production.

## Rolling back a secret rotation

If a newly-rotated secret breaks something (e.g. a typo in a new database password):
1. The previous secret value is not automatically recoverable from AWS Secrets Manager once
   overwritten — this is why secret changes should be tested on staging first, and why you should
   keep the old value somewhere safe (briefly, until the new one is confirmed working) rather than
   discarding it immediately.
2. If the old value truly is gone, treat it as a fresh incident: generate a new correct value,
   update it in Secrets Manager, and redeploy.

## After any rollback

- Confirm the health checks are green.
- Walk through the relevant items in `STAGING_CHECKLIST.md` or `PRODUCTION_CHECKLIST.md` again.
- Write down what happened and why, before making the next change — this becomes the next entry in
  `OPERATIONS_RUNBOOK.md`'s incident history.
