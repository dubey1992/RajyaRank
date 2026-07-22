#!/usr/bin/env sh
# ============================================================================
# RajyaRank — release migration. Run ONCE per deploy as a one-shot job
# (a dedicated migrate container / K8s Job / ECS task) — NEVER per API replica,
# to avoid concurrent-migration races across replicas.
#
# Runs from the API image working dir (/app), where ./prisma/schema.prisma and
# ./prisma/constraints.sql are present. Requires DATABASE_URL in the environment.
# `prisma db execute` applies the raw SQL without needing a psql client.
# constraints.sql is idempotent (IF NOT EXISTS / OR REPLACE), so re-running is safe.
# ============================================================================
set -eu

echo "[migrate] prisma migrate deploy…"
npx prisma@5.22.0 migrate deploy --schema=./prisma/schema.prisma

echo "[migrate] applying raw-SQL constraints (idempotent)…"
npx prisma@5.22.0 db execute --file ./prisma/constraints.sql --schema ./prisma/schema.prisma

echo "[migrate] done."
