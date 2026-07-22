# ADR 0001 — Stack, monorepo, and application boundaries

**Status:** Accepted (2026-07-13)

## Context
Strongly-relational domain (courses, tests, attempts, payments, permissions, content workflow) with
bilingual, mobile-first, secure requirements; needs to scale to more states.

## Decision
- **PostgreSQL + Prisma** (not Firebase) — relational integrity, transactions, constraints, and audit.
- **pnpm + Turborepo** TypeScript monorepo.
- **NestJS API** (`apps/api`) with clear domain modules + a **worker** for async jobs — cleaner
  boundaries than a single Next.js backend for this scope.
- **Two Next.js apps** — `web` (public + student, SSR/SEO, PWA) and `admin` (staff) — separate login
  surfaces, bundles, and indexing policy as required.
- Shared packages isolate the design system, API contracts (zod), the pure authz engine, and i18n.

## Consequences
More moving parts than a single app, but each concern is independently testable/deployable and the
security-critical authorization logic is a pure, unit-tested package reused across API, tests, and
(as hints) the admin UI.
