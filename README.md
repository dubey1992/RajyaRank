# RajyaRank — राज्यरैंक

## What this application does

RajyaRank is a bilingual (Hindi-first + English) exam-preparation website for students preparing
for government job exams in Bihar & Jharkhand (built to expand to other Indian states). Students
watch video lessons, read notes, take practice tests, and buy courses or subscription plans online
(via Razorpay). Staff — teachers, content reviewers, and institution admins — use a separate admin
portal to create courses, review content before it goes live, manage students, and handle payments.

## Technology stack

| Layer | What it is | In plain terms |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | One repository, four apps, shared code between them |
| Backend API | NestJS (`apps/api`) | The "brain" — handles logins, payments, data |
| Background worker | `apps/worker` | Sends emails/SMS in the background without slowing down the website |
| Student website | Next.js (`apps/web`) | What students see and use |
| Staff admin portal | Next.js (`apps/admin`) | What teachers/staff see and use |
| Database | PostgreSQL (via Prisma) | Where all the data (users, courses, payments) is stored |
| Cache/queues | Redis | Speeds things up and manages background tasks |
| File storage | S3-compatible object storage | Where videos, PDFs, and images live |
| Payments | Razorpay | Handles real money transactions |

## Required software (to run this on your own computer)

- **Node.js** version 20 or newer (the project is tested against 22 — see `.nvmrc`)
- **pnpm** version 9 (a package manager, install with `corepack enable` — comes with Node)
- **Docker** (runs a local database/cache/storage on your machine so you don't need real AWS accounts for local development)

## How to run this locally

```bash
corepack enable
pnpm install

# Copy the example settings file and fill in the blanks (see below)
cp .env.example .env

# Start a local database, cache, and file storage on your own computer
pnpm docker:up

# Set up the database structure and add some starter data
pnpm --filter @rajyarank/api prisma migrate deploy
pnpm --filter @rajyarank/api prisma db seed

# Start everything (API on :4000, student site on :3000, admin portal on :3001)
pnpm dev
```

Then open `http://localhost:3000` (student site) or `http://localhost:3001/admin/login` (staff).

### Creating your local environment variables (`.env`)

The `.env` file holds settings and secrets your copy of the app needs — things like database
passwords and security keys. **This file must never be shared, committed to Git, or shown to
anyone.** `.env.example` lists every setting name with a safe placeholder so you know what to fill
in; copy it to `.env` and replace the placeholders. For local development, most defaults already
work with the Docker services `pnpm docker:up` starts — you mainly need to generate the two
security keys:

```bash
openssl rand -base64 48   # run this twice — for JWT_ACCESS_SECRET and JWT_REFRESH_SECRET
```

*(On Windows without Git Bash/WSL, `openssl` may not be available — see DEPLOYMENT.md for a
PowerShell alternative.)*

### Seeded demo accounts (local development only — never exist in production)

| Role | Email | Password |
|---|---|---|
| Teacher | teacher@rajyarank.dev | RajyaRank@Dev1 |
| Reviewer | reviewer@rajyarank.dev | RajyaRank@Dev1 |
| Content Admin | content-admin@rajyarank.dev | RajyaRank@Dev1 |
| Support | support@rajyarank.dev | RajyaRank@Dev1 |
| Super Admin | super-admin@rajyarank.dev | RajyaRank@Dev1 (has 2FA enabled) |

Demo student phone number: `9876543210` (the OTP code is printed in the API's terminal output, not
actually texted, while running locally).

## How to run tests and checks

```bash
pnpm lint         # checks code style, catches likely bugs
pnpm typecheck    # checks that the code's data types are consistent
pnpm test         # runs the automated test suite
pnpm build        # produces the real, optimized version of the app (what actually gets deployed)
```

All four currently pass cleanly — see `SECURITY_CHECKLIST.md` for what's covered and what isn't yet.

## How branches work

- **`main`** — the production branch. Whatever is here is (or is about to become) what real users see.
- **`staging`** — the testing branch. Changes go here first to be verified before reaching real users.
- **`feature/*`** — one branch per change you're working on (e.g. `feature/fix-login-button`).

The day-to-day flow: branch off `staging` → make your change → open a Pull Request back into
`staging` → once it's live and verified on staging, open a Pull Request from `staging` into `main`
→ approve the production deployment. See the **"What I must do when I change the code"** section at
the bottom of `DEPLOYMENT.md` for the exact step-by-step.

## How staging and production deployment work

Full details, exact commands, and what gets checked at each step are in **[DEPLOYMENT.md](DEPLOYMENT.md)**.
In short: pushing to `staging` automatically builds and deploys a staging copy of the app for
testing. Deploying to `main` (production, the real live site) requires your explicit typed approval
and only happens after staging has been verified using `STAGING_CHECKLIST.md`.

## Where to find logs

- **Locally**: right in your terminal window where you ran `pnpm dev`.
- **Once deployed to AWS**: in Amazon CloudWatch (see `OPERATIONS_RUNBOOK.md` for the exact steps —
  written for someone who has never used AWS before).

## How to roll back a bad deployment

See **[ROLLBACK.md](ROLLBACK.md)** for the exact, copy-pasteable steps. Short version: every deploy
is a numbered, saved version — rolling back means telling the system to switch back to the
previous saved version, which takes a few minutes and does not require rewriting any code.

## Repository layout

```
apps/       api (backend) · worker (background jobs) · web (student site) · admin (staff portal)
packages/   shared code used by more than one app (auth logic, UI components, translations, etc.)
infra/      Docker files and deployment configuration
docs/       architecture notes, design decisions, and deeper technical documentation
e2e/        automated browser tests that click through the real app
```

## More documentation

| File | What's in it |
|---|---|
| `DEPLOYMENT.md` | Exact commands to deploy to staging or production |
| `STAGING_CHECKLIST.md` | What to manually verify after every staging deploy |
| `PRODUCTION_CHECKLIST.md` | What to verify before/after every production deploy |
| `SECURITY_CHECKLIST.md` | Security posture, what's covered, known gaps |
| `ROLLBACK.md` | How to undo a bad deployment |
| `OPERATIONS_RUNBOOK.md` | Day-to-day operations: checking logs, redeploying, rotating secrets |
| `docs/environments.md` | The full list of environments, URLs, and settings |
