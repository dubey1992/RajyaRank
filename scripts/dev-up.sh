#!/usr/bin/env bash
# ============================================================================
# No-Docker local dev bring-up for sandboxes with no Docker/Postgres/Redis and
# no root (can't apt-get anything). If you DO have Docker, ignore this file
# and use the normal path instead: `pnpm docker:up` (see README).
#
# This script brings up, all in userland under /tmp/devsvc:
#   - Postgres  (embedded-postgres npm package, real PG binary)      :5432
#   - MailDev   (SMTP catcher + web inbox)                     :1025 / :1080
#   - s3rver    (S3-compatible object storage)                       :9000
#   - API       (NestJS via ts-node, --watch)                        :4000
#   - Web       (Next.js, student app)                                :3000
#   - Admin     (Next.js, staff app)                                  :3001
# Redis is NOT a separate process — the API runs with REDIS_INMEMORY=true
# (ioredis-mock in-process) and delivers queued email/SMS itself via
# DevQueueConsumerService, so apps/worker is intentionally not started here.
#
# /tmp is wiped on every sandbox reboot, so this script re-does everything
# from scratch each time. Safe to re-run: each step skips work that's
# already done (installed packages, running services, already-open ports).
#
# Usage:  bash scripts/dev-up.sh
# ============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEVSVC="/tmp/devsvc"
API_ENV="/tmp/api.env"
API_LOG="/tmp/api.log"
WEB_LOG="/tmp/web.log"
ADMIN_LOG="/tmp/admin.log"

log() { echo "==> $*"; }

is_listening() {
  ss -ltn 2>/dev/null | grep -q ":$1 "
}

wait_for_port() {
  local port=$1 name=$2 tries=0
  while ! is_listening "$port"; do
    tries=$((tries + 1))
    if [ "$tries" -gt 60 ]; then
      echo "!! $name did not open port $port in time — check its log." >&2
      return 1
    fi
    sleep 1
  done
}

# ---------------------------------------------------------------------------
# 1. Infra packages (Postgres, MailDev, s3rver) — installed once into /tmp/devsvc
# ---------------------------------------------------------------------------
mkdir -p "$DEVSVC"
if [ ! -d "$DEVSVC/node_modules/embedded-postgres" ]; then
  log "Installing embedded-postgres, maildev, s3rver into $DEVSVC (first run only)…"
  (cd "$DEVSVC" && npm i embedded-postgres maildev s3rver --no-audit --no-fund)
else
  log "Infra packages already installed in $DEVSVC — skipping npm install."
fi

cat > "$DEVSVC/pg-launch.mjs" <<'EOF'
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';

const pg = new EmbeddedPostgres({
  databaseDir: '/tmp/devsvc/pgdata',
  user: 'rajyarank',
  password: 'rajyarank',
  port: 5432,
  persistent: true,
});

if (!existsSync('/tmp/devsvc/pgdata/PG_VERSION')) {
  await pg.initialise();
}
await pg.start();
try {
  await pg.createDatabase('rajyarank');
} catch {
  // already exists — fine
}
console.log('postgres ready on 5432');
await new Promise(() => {}); // keep the process alive
EOF

cat > "$DEVSVC/cors.xml" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
  </CORSRule>
</CORSConfiguration>
EOF

# ---------------------------------------------------------------------------
# 2. Launch Postgres, MailDev, s3rver (skip any that are already up)
# ---------------------------------------------------------------------------
if is_listening 5432; then
  log "Postgres already listening on :5432 — skipping."
else
  log "Starting Postgres…"
  (cd "$DEVSVC" && nohup node pg-launch.mjs > "$DEVSVC/pg.log" 2>&1 &)
  wait_for_port 5432 "Postgres"
fi

if is_listening 1080; then
  log "MailDev already listening on :1080 — skipping."
else
  log "Starting MailDev (SMTP :1025, web inbox :1080)…"
  (cd "$DEVSVC" && nohup npx maildev --smtp 1025 --web 1080 > "$DEVSVC/maildev.log" 2>&1 &)
  wait_for_port 1080 "MailDev"
fi

if is_listening 9000; then
  log "s3rver already listening on :9000 — skipping."
else
  log "Starting s3rver…"
  (cd "$DEVSVC" && nohup npx s3rver -d "$DEVSVC/s3data" -a 0.0.0.0 -p 9000 --allow-mismatched-signatures --configure-bucket rajyarank-private ./cors.xml > "$DEVSVC/s3.log" 2>&1 &)
  wait_for_port 9000 "s3rver"
fi

# ---------------------------------------------------------------------------
# 3. Write /tmp/api.env (dev config — matches .env.example, tuned for this
#    no-Docker setup: REDIS_INMEMORY, s3rver creds, AUTH_DEV_SKIP_MFA)
# ---------------------------------------------------------------------------
log "Writing $API_ENV…"
cat > "$API_ENV" <<'EOF'
NODE_ENV=development
APP_ENV=local
API_PORT=4000
API_PUBLIC_URL=http://localhost:4000
DATABASE_URL=postgresql://rajyarank:rajyarank@localhost:5432/rajyarank?schema=public
REDIS_INMEMORY=true
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=dev-access-secret-please-change-min-32-bytes-xx
JWT_REFRESH_SECRET=dev-refresh-secret-please-change-min-32-bytes-x
ACCESS_TOKEN_TTL=600
REFRESH_TOKEN_TTL=2592000
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false
FIELD_ENCRYPTION_KEY=0deEaAQmEwOcFM5MvpHJN127dRfx3ldeVV+Dlh2ozG4=
SMS_PROVIDER=log
SMS_API_KEY=
OTP_TTL=300
OTP_MAX_ATTEMPTS=5
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="RajyaRank <no-reply@rajyarank.dev>"
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/api/v1/auth/student/google/callback
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=S3RVER
S3_SECRET_KEY=S3RVER
S3_BUCKET_PRIVATE=rajyarank-private
INVITATION_TTL_HOURS=48
ADMIN_PUBLIC_URL=http://localhost:3001
WEB_PUBLIC_URL=http://localhost:3000
LOGIN_MAX_FAILURES=5
LOGIN_LOCKOUT_MINUTES=15
NEXT_PUBLIC_API_URL=http://localhost:4000
WEB_PORT=3000
ADMIN_PORT=3001
DEFAULT_LOCALE=hi
LOG_LEVEL=info
AUTH_DEV_SKIP_MFA=true
RAZORPAY_WEBHOOK_SECRET=dev-local-webhook-secret-for-testing
EOF

# ---------------------------------------------------------------------------
# 4. Prisma: push schema, apply constraints.sql, generate client, seed data
#    (skipped if the API is already up — schema/data are presumably current)
# ---------------------------------------------------------------------------
if is_listening 4000; then
  log "API already running on :4000 — skipping Prisma push/seed (schema/data assumed current)."
else
  log "Syncing Prisma schema to the database…"
  (cd "$REPO_ROOT/apps/api" && set -a && source "$API_ENV" && set +a && npx prisma db push --skip-generate)

  log "Applying constraints.sql (no psql binary in this sandbox — use prisma db execute)…"
  (cd "$REPO_ROOT/apps/api" && set -a && source "$API_ENV" && set +a && npx prisma db execute --file prisma/constraints.sql --schema prisma/schema.prisma)

  log "Generating Prisma client…"
  (cd "$REPO_ROOT/apps/api" && set -a && source "$API_ENV" && set +a && npx prisma generate)

  log "Seeding demo data…"
  (cd "$REPO_ROOT/apps/api" && set -a && source "$API_ENV" && set +a && TS_NODE_PROJECT=tsconfig.dev.json npx ts-node -r tsconfig-paths/register prisma/seed.ts)
fi

# ---------------------------------------------------------------------------
# 5. Launch API, Web, Admin (skip any already listening)
# ---------------------------------------------------------------------------
if is_listening 4000; then
  log "API already listening on :4000 — skipping."
else
  log "Starting API (NestJS, --watch)…"
  (cd "$REPO_ROOT/apps/api" && set -a && source "$API_ENV" && set +a && TS_NODE_PROJECT=tsconfig.dev.json nohup node --watch -r ts-node/register -r tsconfig-paths/register src/main.ts > "$API_LOG" 2>&1 &)
  wait_for_port 4000 "API"
fi

if is_listening 3000; then
  log "Web already listening on :3000 — skipping."
else
  log "Starting Web (Next.js)…"
  (cd "$REPO_ROOT/apps/web" && set -a && source "$API_ENV" && set +a && nohup pnpm dev > "$WEB_LOG" 2>&1 &)
  wait_for_port 3000 "Web"
fi

if is_listening 3001; then
  log "Admin already listening on :3001 — skipping."
else
  log "Starting Admin (Next.js)…"
  (cd "$REPO_ROOT/apps/admin" && set -a && source "$API_ENV" && set +a && nohup pnpm dev > "$ADMIN_LOG" 2>&1 &)
  wait_for_port 3001 "Admin"
fi

# ---------------------------------------------------------------------------
# 6. Summary
# ---------------------------------------------------------------------------
echo
log "All services up:"
echo "  Web (student app)  http://localhost:3000"
echo "  Admin (staff app)  http://localhost:3001/en/admin/login"
echo "  API                http://localhost:4000  (healthz: curl http://localhost:4000/healthz)"
echo "  MailDev inbox      http://localhost:1080"
echo
echo "  Staff logins (password RajyaRank@Dev1, no MFA except super-admin):"
echo "    content-admin@rajyarank.dev   Content Admin"
echo "    teacher@rajyarank.dev         Teacher"
echo "    reviewer@rajyarank.dev        Academic Reviewer"
echo "    support@rajyarank.dev         Support Agent"
echo "    head@greenvalley.dev          Academic Head"
echo "    super-admin@rajyarank.dev     Super Admin (MFA on; TOTP secret printed above during seed)"
echo "  Demo student phone: 9876543210 (OTP printed in $API_LOG)"
echo
echo "  Logs: $API_LOG  $WEB_LOG  $ADMIN_LOG  $DEVSVC/{pg,maildev,s3}.log"
