# Backup & Restore

## What to protect
- **PostgreSQL** — the system of record (users, content, questions, attempts, orders, payments,
  entitlements, audit). Financial + audit rows are append-only and must never be silently deleted.
- **Object storage (S3)** — protected media/documents.
- **Secrets** — in the secret manager (backed up by that service).

## PostgreSQL
- Managed instance with **automated daily backups** + **point-in-time recovery (PITR)** enabled.
- Take an on-demand snapshot immediately **before every migration/deploy**.
- Ad-hoc logical backup:
  ```bash
  pg_dump "$DATABASE_URL" -Fc -f rajyarank_$(date +%F).dump
  # restore into a fresh database:
  pg_restore --clean --if-exists -d "$TARGET_DATABASE_URL" rajyarank_YYYY-MM-DD.dump
  ```
- `scripts/backup.sh` wraps `pg_dump` for cron/CI use.

## Object storage
- Enable bucket **versioning** + lifecycle rules; replicate to a second region for DR.

## Restore testing (required before launch, then quarterly)
1. Restore the latest backup into an isolated database.
2. Run `prisma migrate status` (no drift) and app smoke tests.
3. Verify row counts for users/orders/payments/entitlements/audit.
4. Record RTO/RPO achieved. Target: **RPO ≤ 24h (PITR ≤ 5m), RTO ≤ 1h.**

## Rollback
Migrations are forward-only. For a bad migration: restore the pre-deploy snapshot (or PITR to just
before it) and redeploy the previous image tag. Never hand-edit production data outside a reviewed migration.
