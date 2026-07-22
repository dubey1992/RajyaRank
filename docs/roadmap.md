# Development Roadmap

Build order is Foundation-first, then phase by phase. **Later phases must not be silently dropped.**

- **Foundation ✅** — monorepo, envs, Docker, CI, design system, i18n, Prisma + seed, audit, logging, health.
- **Phase 1 ✅ (this delivery)** — student + staff auth, MFA, invitations, roles, permissions,
  assignment-based access control, sessions, central permission engine, audit log.
- **Phase 2** — exam & course catalogue; hierarchy State→Exam→Course→Batch→Subject→Chapter→Topic→
  Lesson; batches; media/document assets; secure S3 upload (intents + validation + malware scan).
- **Phase 3 ✅** — content workflow: state machine (submit → start-review → request-correction /
  approve / reject → schedule / publish → unpublish / archive), review comments timeline, review
  queue (scope-filtered), teacher "my content", optimistic-concurrency edits, publish supersedes the
  prior published version, versioning via new DRAFT revisions. Publishing requires `content.publish`
  + MFA (AAL2). Functional admin Review Queue + My Content pages.
- **Phase 4 ✅** — student learning: onboarding (state/exam/qualification/daily-time → profile),
  "what should I study today?" dashboard (target exam, countdown, today's plan, continue-watching,
  streak, stats, current affairs), lesson player with **signed short-lived media URLs** + user
  watermark + resume/progress, bookmarks, revision centre, current-affairs feed. Free-preview lessons
  open; paid lessons return `ENTITLEMENT_REQUIRED` until Phase 6. Brand logo + favicon across web/admin.
- **Phase 5 ✅** — test engine (NOT Google Forms): bilingual **question bank** (single/multiple/
  true-false/numeric/match/passage/assertion types) with draft→submit→approve + duplicate
  fingerprint; **bulk import** with per-row validation (`imported`/`errors[]`); **test builder**
  (sections, questions from approved bank, negative marking, randomization, result-release policy,
  attempt limits, publish w/ MFA supersedes prior version); **timed test-taking** (immutable
  TestVersion, resume active attempt, question palette, mark-for-review, autosave via PUT,
  offline-tolerant, timer auto-submit); **server-side scoring** (correct answers never leave the
  server before release) + accuracy + subject-wise analysis + released explanations. Functional
  student test-runner UI + admin question-bank authoring.
- **Phase 6 ✅** — payments & entitlements: Razorpay orders (REST, dev-safe fallback), **backend HMAC
  signature verification** + **idempotent webhook** (unique provider event id) — frontend callback
  never trusted; **entitlements are the sole access source** (no global isPaid) with status + expiry,
  granted only from verified payment or authorised admin/scholarship grant; coupons (percent/fixed,
  window, per-user + max redemptions); refunds (revoke access on full refund, AAL2); products.
  The student content gate now checks live entitlements (free-preview stays open; paid → real
  entitlement or `ENTITLEMENT_REQUIRED`). UI: pricing + Razorpay checkout (graceful no-key fallback)
  + My Account (entitlements + orders).
- **Phase 7 ✅** — doubts (text/image + lesson/question/test refs; statuses Open→Assigned→Answered→
  Resolved→Reopened→Closed; teacher replies via `doubt.respond`); notifications (in-app + email + SMS
  via worker; per-category/channel preferences; SECURITY/PAYMENT always delivered); support tickets
  (categories/statuses, least-privilege support agent, internal notes) + admin Support queue.
  Events wired: doubt answered, support reply, payment paid → notifications.
- **Phase 8 ✅** — production readiness: security hardening (concurrent-session cap, web/admin CSP +
  security headers, `SECURITY.md` + threat model, CI dependency audit); PWA (manifest + service worker
  + offline fallback + install); monitoring (`/metrics` + request-metrics interceptor, Sentry hook,
  `docs/monitoring.md`); backups + restore (`docs/backup-restore.md`, `scripts/backup.sh`);
  deployment (multi-stage Dockerfiles api/worker/web/admin + `docker-compose.prod.yml`, Next
  standalone, API webpack-bundles workspace pkgs); tests expanded (policy 16, scoring jest 9).
  Pre-launch follow-ups tracked: malware scan, nonce CSP, image scan + pen-test.

Cross-cutting non-negotiables (every phase): bilingual EN/HI; all UI states; server-side authz +
validation; audit on sensitive actions; entitlement-based access; content protection; no secrets in
source; mobile-first + low-bandwidth + accessible; automated tests for critical flows.
