# Monitoring & Observability

## Health
- `GET /healthz` — liveness (process up).
- `GET /readyz` — readiness (Postgres + Redis reachable). Wire both to the orchestrator.

## Metrics
- `GET /metrics` — Prometheus exposition (`apps/api/src/monitoring`). Currently: requests by status
  class, average request duration, and **`rr_authz_denied_total`** (403s — a security signal).
  Restrict `/metrics` to the internal network / scraper at the ingress.
- A `MetricsInterceptor` records status + latency for every request (success and error).

## Logging
- Structured JSON via `nestjs-pino`; a **correlation id** (`x-request-id`) is attached per request and
  echoed in the response header and every log line. Authorization/cookie headers are redacted.
- 5xx errors are logged with the correlation id by the global exception filter.

## Error tracking
- `SENTRY_DSN` env var is reserved. When set, initialise Sentry in `apps/api/src/main.ts` (and the
  Next apps) and capture in the exception filter. Ship release + environment (`APP_ENV`) tags.

## Alerts (recommended)
- Repeated webhook signature failures, asset-processing failures, spikes in `rr_authz_denied_total`,
  elevated 5xx rate, queue depth, and job failures (dead-letter). OTP/payment provider dashboards.
