# Deployment Guide

> **Where we are right now:** this document is being built up phase by phase, alongside the actual
> deployment work. Sections marked **✅ Active** are true today. Sections marked **⏳ Not yet
> set up** describe what *will* happen once we reach that phase — don't run those commands yet,
> they won't work until then. This file will be updated (with real URLs, real commands) as each
> phase completes.

## Local development ✅ Active

```bash
corepack enable
pnpm install
cp .env.example .env
# fill in .env — see README.md "Creating your local environment variables"

pnpm docker:up                                              # starts local Postgres, Redis, MinIO
pnpm --filter @rajyarank/api prisma migrate deploy           # sets up database tables
pnpm --filter @rajyarank/api prisma db seed                  # adds starter/reference data
pnpm dev                                                      # starts all 4 apps
```

Stop everything: `Ctrl+C` in the terminal, then `pnpm docker:down` to stop the local database/etc.

### Running the checks that also run automatically before every deploy

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

If any of these fail, deployment will be blocked automatically — this is intentional, not a bug to
work around.

### Building and running the real, production version locally (to double-check before deploying)

```bash
pnpm build
pnpm --filter @rajyarank/api start     # API on :4000 — needs a real DATABASE_URL etc. in .env
pnpm --filter @rajyarank/web start     # student site on :3000
pnpm --filter @rajyarank/admin start   # admin portal on :3001
```

**Windows note:** all of the above works identically in PowerShell or Command Prompt once Node.js
and pnpm are installed — these are plain `pnpm` commands, not shell scripts. The one exception is
`openssl` (used to generate secrets) — Windows doesn't include it by default. Easiest fix: install
[Git for Windows](https://git-scm.com/download/win) (which bundles a Git Bash terminal that has
`openssl`), or generate secrets with this PowerShell one-liner instead:
```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

## Git and GitHub setup ⏳ Not yet set up

*(This section will be filled in during Phase 2, once we've connected to your GitHub repository.)*

## Staging deployment ⏳ Not yet set up

*(This section will be filled in during Phase 5, with the real staging URLs once staging exists.)*

## Production deployment ⏳ Not yet set up

*(This section will be filled in during Phase 6 — production is only ever deployed after you
type the exact phrase `APPROVE PRODUCTION DEPLOYMENT`.)*

## "What I must do when I change the code" — the everyday workflow

Once Phase 2 (Git/GitHub) is set up, this will be the routine for every future change:

1. **Create a feature branch** — a copy of the code just for your one change:
   ```bash
   git checkout staging
   git pull
   git checkout -b feature/short-description-of-change
   ```
2. **Make your change** in the code.
3. **Run the checks**: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
4. **Push your branch**:
   ```bash
   git push -u origin feature/short-description-of-change
   ```
5. **Open a Pull Request** on GitHub, targeting the `staging` branch. This shows your change as a
   reviewable diff and automatically runs the same checks again in the cloud.
6. **Once merged, verify it on the staging URL** — click through the specific thing you changed.
7. **Open a second Pull Request**, this time from `staging` into `main`.
8. **Approve the production deployment** when prompted (typing the exact confirmation phrase).
9. **Verify the production URL** — the same check you did on staging, now on the real site.

This is the same flow whether you're on this computer now or on Windows later — everything here is
plain Git and pnpm commands, not tied to one operating system.
