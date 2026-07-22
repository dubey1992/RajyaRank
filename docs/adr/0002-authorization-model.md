# ADR 0002 — Assignment-based authorization

**Status:** Accepted (2026-07-13)

## Context
The PRD requires permissions to depend on more than role name: assigned state/exam/course/subject/
batch, content ownership, and content status. "Frontend hiding is not security."

## Decision
A single pure function `evaluate(PolicyInput): PolicyDecision` in `packages/auth`, fail-closed, in a
fixed order: account-active → Super Admin override (still honors AAL2) → permission-code capability →
session assurance → ownership (`*_own`) → content status (data-driven table) → assignment scope
(broader assignment covers narrower resource). Wired into NestJS via `PermissionsGuard` +
`@RequirePermission`/`@ResourceFrom`. The resolved `Principal` is cached in Redis keyed by a per-user
`permVersion` that is bumped on any role/assignment/status/MFA change. Denials return HTTP 403
`PERMISSION_DENIED` and write an append-only audit event.

## Consequences
One auditable decision point; no scattered role checks (an ESLint rule forbids role-name comparisons).
The engine is framework-free and exhaustively unit-tested. Cache invalidation must bump `permVersion`
— documented and centralized in `AuthorizationService.invalidate`.
