# CI/CD

Two workflows under `.github/workflows/`:

- **`ci.yml`** (PR + main): install → i18n check → format → lint → typecheck → build → unit tests, plus an `integration` job (Postgres + Redis services, `prisma migrate deploy` + `constraints.sql`, integration tests). This gates every PR.
- **`deploy.yml`** (merge to `main`, tags `v*`, manual): builds the four images (`api`, `worker`, `web`, `admin`) with Buildx and pushes them to **GHCR** (`ghcr.io/<owner>/<repo>/<app>`), tagged `:sha`, `:main`, `:latest`, and `:vX.Y.Z` on release tags. No external registry account needed — GHCR ships with GitHub.

## Repo settings required (one-time)
- Actions → Workflow permissions: allow **read/write** (so `GITHUB_TOKEN` can push to GHCR), or the images job can't publish.
- Actions **variable** `NEXT_PUBLIC_API_URL` = the API URL that web/admin should call (per environment; baked at build time). For multi-tier, build per-tier or override at deploy with separately-built images.

## Rollout (registry-based, compose)
On the target host, with Docker + an `.env` for the tier (from `.env.<tier>.example`):

```bash
export IMAGE_PREFIX=ghcr.io/<owner>/<repo>
export TAG=v1.0.0                     # or latest
docker compose -f infra/docker/docker-compose.deploy.yml pull
docker compose -f infra/docker/docker-compose.deploy.yml up -d
```

The `migrate` service runs `prisma migrate deploy` + `constraints.sql` (idempotent) and must complete before `api`/`worker` start. Health: API `/healthz` (liveness) + `/readyz` (db+redis). Roll back by re-deploying a previous `TAG`.

Alternative: `docker-compose.prod.yml` builds the images on the host instead of pulling (no registry needed).

## Kubernetes / ECS
Use the same images. Run the migration as a pre-deploy **Job** / one-off task with command `sh migrate.sh` on the `api` image, gate the app rollout on its success, then deploy `api`/`worker`/`web`/`admin` Deployments. Wire `/healthz` (liveness) and `/readyz` (readiness) probes on the API.

## Still target-specific (needs your input)
The **deploy step itself** depends on where you host. Confirm the target (a VM with docker-compose, Kubernetes, or AWS ECS) and I'll add the concrete deploy job (SSH+compose, `kubectl`/Helm, or ECS task update) to `deploy.yml`.
