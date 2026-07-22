# Requirements Validation Matrix

Traceability from the product requirements to implementation. Status legend:
**✅ Implemented** · **◑ Partial / MVP** · **⏳ Planned (Phase 8)** · **🔭 Future (post-launch)**.
"Where" points at the code/docs. Use this to validate scope; flag any row you disagree with.

## Product & platform
| Requirement | Status | Where / notes |
|---|---|---|
| Bilingual Hindi-first + English, persisted, no browser auto-translate, managed strings | ✅ | `packages/i18n`, `<html translate="no">`, `User.locale`, CI key-parity check |
| Four surfaces: public site, student app, staff portal, backend | ✅ | `apps/web` (public+student), `apps/admin`, `apps/api`, `apps/worker` |
| Mobile-first, low-bandwidth, accessible, state-configurable | ◑ | Tailwind mobile-first + AA tokens + focus states; formal a11y/perf audit ⏳ Phase 8 |
| Expandable to more states without rearchitecture | ✅ | `State`/`Exam` are data; scope + catalogue are generic |

## Auth & RBAC (Phase 1)
| Requirement | Status | Where |
|---|---|---|
| Separate student (`/login`) & staff (`/admin/login`) portals; **no role selector** | ✅ | `apps/web/.../login`, `apps/admin/.../admin/login` |
| Student phone OTP + Google + auto Student role | ✅ | `auth/auth.service.ts` (OTP), Google callback scaffolded |
| Staff email+password, email OTP, **MFA (TOTP)** for sensitive roles | ✅ | `auth/mfa.service.ts`, staff login → MFA step |
| Invitation-based staff creation + lifecycle (resend/revoke/expire/reassign) | ✅ | `invitations/`, admin dashboard Invite Staff |
| RBAC **+ assignment scope + ownership + content status** (not role-name) | ✅ | `packages/auth/policy.engine.ts` (13 unit tests), `authz/` guard |
| Denied protected endpoint → 403 `PERMISSION_DENIED` + audit event | ✅ | `PermissionsGuard`, integration spec |
| Sessions: HttpOnly cookies, refresh rotation + reuse-detection, logout-all, lockout, OTP limits | ✅ | `auth/session.service.ts`, `token.service.ts` |
| Append-only audit log (actor/action/target/before/after/ip/correlation) | ✅ | `audit/`, DB trigger in `constraints.sql` |

## Catalogue, content & workflow (Phases 2–3)
| Requirement | Status | Where |
|---|---|---|
| Hierarchy State→Exam→Course→Batch→Subject→Chapter→Topic→Lesson | ✅ | Prisma schema; `courses/` admin CRUD (scope-checked) |
| Secure asset upload (signed intents, MIME/size validation) | ◑ | `assets/` presigned S3 PUT + validation; malware scan ⏳ Phase 8 |
| Content lifecycle Draft→Submitted→Review→Correction/Approved→Scheduled→Published→Unpublished/Archived | ✅ | `content-workflow/` state machine + review comments + audit |
| Teachers/Reviewers cannot publish; Content Admin publishes (MFA) | ✅ | permission matrix + `content.publish` AAL2 |
| Versioning; published content not silently overwritten | ✅ | `LessonVersion`, publish supersedes prior; `new-version` |
| Exam detail Official/Expected/Previous-cycle labelling | ⏳ | catalogue models exist; public exam-detail rendering pending |

## Student learning (Phase 4)
| Requirement | Status | Where |
|---|---|---|
| Onboarding → study plan; "what to study today" dashboard | ✅ | `student/` onboarding + dashboard, `apps/web/.../dashboard` |
| Protected video/PDF via **signed short-lived URLs** + watermark + resume/progress | ✅ | `student.service.playbackToken`, `learn/[lessonId]` player |
| Revision (bookmarks, in-progress), current affairs feed | ◑ | bookmarks + revision + current-affairs read; flashcards/spaced-repetition 🔭 |
| Live classes | 🔭 | post-launch |

## Test engine (Phase 5)
| Requirement | Status | Where |
|---|---|---|
| Bilingual question bank, all question types, review status, duplicate check | ✅ | `question-bank/`, `answer-shape.ts` |
| Bulk import with **row-level validation** | ✅ | `POST /staff/questions/import` (client parses CSV/XLSX → rows) |
| Test builder (sections, marks, negative, randomization, windows, attempt limits) | ✅ | `test-builder/` |
| Timed test-taking: palette, mark-review, autosave, offline-tolerant, auto-submit, immutable version | ✅ | `student-tests/`, `tests/[id]/runner.tsx` |
| **Server-side scoring**; answers never sent before release; subject analysis | ✅ | `student-tests.service.submit/result` |
| Rank/percentile when statistically valid | 🔭 | analysis hooks present; cohort ranking later |

## Payments & entitlements (Phase 6)
| Requirement | Status | Where |
|---|---|---|
| Razorpay orders (backend), **signature + idempotent webhook** verification | ✅ | `payments/razorpay.service.ts`, `payments.service.ts`, `PaymentEvent` |
| Entitlements are sole access source (no global isPaid); status + expiry | ✅ | `entitlement.service.ts`, gate in `student.service` |
| Coupons (percent/fixed, window, limits); refunds (revoke on full) | ✅ | `applyCoupon`, `refund` |
| Referrals; reconciliation reports | ◑ | coupon/referral fields; full reports ⏳ |

## Doubts, notifications, support (Phase 7)
| Requirement | Status | Where |
|---|---|---|
| Doubts (text/image + lesson/question/test refs), statuses, teacher replies | ✅ | `doubts/` |
| Notifications in-app + email + SMS, per-category/channel preferences, essential-always | ✅ | `notifications/notification.service.ts` + worker |
| Push notifications | ⏳ | preference flag present; web-push wiring Phase 8 |
| Support tickets, categories/statuses, least-privilege support agent, internal notes | ✅ | `support/`, admin Support queue |

## Non-functional & delivery
| Requirement | Status | Where |
|---|---|---|
| PostgreSQL + Prisma; UUIDs, audit fields, soft-delete, indexes, constraints, idempotency keys | ✅ | `schema.prisma`, `constraints.sql` |
| Env separation local/staging/preproduction/production; secrets outside code | ✅ | `.env.*.example`, `docs/environments.md` |
| Docker, CI, migrations, seed, health, structured logging | ✅ | `infra/docker`, `.github/workflows`, `/healthz`,`/readyz`, pino |
| Content protection (no public permanent URLs, concurrent-session limits) | ◑ | signed URLs + watermark; concurrent-session cap ⏳ Phase 8 |
| Automated tests: unit + integration + e2e for critical paths | ◑ | policy unit (13✅), auth integration + Playwright specs; broaden ⏳ Phase 8 |
| Security review, perf/PWA, a11y, monitoring, backups, deployment docs, user guides | ⏳ | Phase 8 (guides + checklists already drafted in `docs/`) |

## Deliverables (§27) quick status
Architecture ✅ · design system ✅ · sitemap/flows ◑ · ER diagram ✅ · schema ✅ · API spec ✅ ·
permission matrix ✅ · frontend+backend+admin+student ✅ · auth ✅ · content workflow ✅ · test engine ✅ ·
payments ✅ · seed ✅ · Docker ✅ · deployment docs ✅ · env template ✅ · README ✅ · user guides ◑ ·
QA/security/launch checklists ◑ (drafted) · automated tests ◑.
