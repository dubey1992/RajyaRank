#!/usr/bin/env bash
# Logical Postgres backup for cron/CI. Requires DATABASE_URL and pg_dump.
set -euo pipefail
: "${DATABASE_URL:?set DATABASE_URL}"
OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"
STAMP="$(date +%Y-%m-%dT%H-%M-%S)"
FILE="$OUT_DIR/rajyarank_${STAMP}.dump"
echo "Backing up → $FILE"
pg_dump "$DATABASE_URL" -Fc -f "$FILE"
echo "Done. Upload to durable, versioned storage and prune old local copies."
