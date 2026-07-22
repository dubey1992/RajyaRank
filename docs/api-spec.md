# API Specification (v1)

Base path `/api/v1`. All requests/responses use a consistent envelope. Request bodies are validated
by shared zod schemas (`packages/contracts`).

**Success:** `{ "data": <payload>, "meta"?: {...}, "requestId": "<correlation-id>" }`
**Error:** `{ "error": { "code": "<ERROR_CODE>", "message": "...", "fieldErrors"?: [...] }, "requestId": "..." }`

Stable error codes: `VALIDATION_FAILED, AUTH_INVALID_CREDENTIALS, AUTH_OTP_INVALID, AUTH_OTP_EXPIRED,
AUTH_OTP_TOO_MANY_ATTEMPTS, AUTH_MFA_REQUIRED, AUTH_MFA_INVALID, ACCOUNT_LOCKED, ACCOUNT_DISABLED,
INVITATION_INVALID, INVITATION_EXPIRED, PERMISSION_DENIED, NOT_FOUND, CONFLICT, RATE_LIMITED,
INTERNAL_ERROR`.

## Authentication

| Method | Path | Auth | Body / Notes |
|---|---|---|---|
| POST | `/auth/student/otp/request` | public | `{ phone }` — rate-limited |
| POST | `/auth/student/otp/verify` | public | `{ phone, code }` → sets cookies, `{ homeRoute }` |
| GET  | `/auth/student/google/start` | public | OAuth start (Phase 1 stub wiring) |
| GET  | `/auth/student/google/callback` | public | OAuth callback |
| POST | `/auth/staff/login` | public | `{ workEmail, password }` → `AUTHENTICATED` or `MFA_REQUIRED` |
| POST | `/auth/staff/mfa/verify` | public | `{ mfaToken, totp }` → cookies (AAL2), `{ homeRoute }` |
| POST | `/auth/refresh` | cookie | rotates refresh; reuse revokes family |
| POST | `/auth/logout` | session | revokes current session |
| POST | `/auth/logout-all` | session | revokes all sessions |
| GET  | `/auth/me` | session | `MeResponse` (roles, permissions, assurance, homeRoute, locale) |
| GET  | `/auth/sessions` | session | active sessions |
| DELETE | `/auth/sessions/:id` | session | revoke one |
| POST | `/auth/locale` | session | `{ locale }` persist preference |
| POST | `/auth/mfa/enroll` | session | begin TOTP enrollment (otpauth URL) |
| POST | `/auth/mfa/confirm` | session | `{ code }` confirm enrollment |

## Staff invitations

| Method | Path | Permission | Notes |
|---|---|---|---|
| POST | `/admin/staff/invitations` | `user.invite` | `{ fullName, email, roleKey, assignments[] }` |
| GET  | `/staff/invitations/:token` | public | preview (name/email/role/expiry) |
| POST | `/staff/invitations/:token/accept` | public | `{ password }` → creates staff + roles + assignments |
| POST | `/admin/staff/invitations/:id/resend` | `user.invite` | new token, old invalidated |
| POST | `/admin/staff/invitations/:id/revoke` | `user.invite` | |

## Staff & permissions administration

| Method | Path | Permission |
|---|---|---|
| GET | `/admin/staff` | `user.manage` |
| PATCH | `/admin/staff/:id/status` | `user.disable` (AAL2) |
| POST | `/admin/staff/:id/assignments` | `assignment.manage` (AAL2) |
| POST | `/admin/staff/:id/force-password-reset` | `user.manage` |
| POST | `/admin/staff/:id/revoke-sessions` | `user.manage` |
| GET | `/admin/roles` · `/admin/permissions` | `role.manage` |
| GET | `/admin/audit-events` | `audit.view` |

## Catalogue (read, public)

`GET /states` · `GET /exam-bodies` · `GET /exams`

## Course hierarchy (Phase 2, admin — `course.manage`, scope-checked)

`GET/POST /admin/courses` · `PATCH /admin/courses/:id` · `POST /admin/courses/:id/batches` ·
`/subjects` · `POST /admin/courses/subjects/:subjectId/chapters` ·
`/chapters/:chapterId/topics` · `/topics/:topicId/lessons` (creates lesson + DRAFT v1).
Public reads: `GET /courses`, `GET /courses/:id/outline`.

## Assets (Phase 2 — `content.create`)

`POST /staff/assets/upload-intents` → presigned S3 PUT (MIME/size validated) · `POST /staff/assets/:id/complete` ·
`GET /staff/assets/:id/status`. No permanent public URLs.

## Content workflow (Phase 3)

Operate on a `LessonVersion`. Each transition re-authorizes via the policy engine
(capability + scope + status) and records a review-comment + audit event.

| Method · Path | Permission | Valid from |
|---|---|---|
| `POST /staff/content/versions/:id/edit` | `content.edit_own`/`edit_all` (rowVersion guard) | DRAFT, CORRECTION_REQUIRED |
| `POST /staff/content/versions/:id/assets` | `content.edit_own` | DRAFT, CORRECTION_REQUIRED |
| `POST /staff/content/versions/:id/submit` | `content.submit_review` | DRAFT, CORRECTION_REQUIRED |
| `POST /staff/content/versions/:id/start-review` | `content.review` | SUBMITTED |
| `POST /staff/content/versions/:id/comment` | `content.review` | any |
| `POST /staff/content/versions/:id/request-correction` | `content.review` | UNDER_REVIEW |
| `POST /staff/content/versions/:id/approve` | `content.approve` | UNDER_REVIEW |
| `POST /staff/content/versions/:id/reject` | `content.approve` | UNDER_REVIEW |
| `POST /staff/content/versions/:id/schedule` | `content.publish` + AAL2 | APPROVED, READY_TO_PUBLISH |
| `POST /staff/content/versions/:id/publish` | `content.publish` + AAL2 | APPROVED, READY_TO_PUBLISH, SCHEDULED |
| `POST /staff/content/versions/:id/unpublish` | `content.unpublish` + AAL2 | PUBLISHED |
| `POST /staff/content/versions/:id/archive` | `content.archive` + AAL2 | any |
| `POST /staff/content/lessons/:lessonId/new-version` | `content.edit_own`/`edit_all` | — |
| `GET /staff/content/review-queue` | `content.review` | scope-filtered SUBMITTED/UNDER_REVIEW |
| `GET /staff/content/mine` | `content.create` | your versions |
| `GET /staff/content/versions/:id/timeline` | `content.review` | review-comment history |

A Teacher calling `…/publish` receives 403 `PERMISSION_DENIED` + audit; a valid transition from the
wrong status returns 409 `CONTENT_STATE_INVALID`; a stale edit returns 409 `CONTENT_VERSION_CONFLICT`.

## Student learning (Phase 4 — authenticated STUDENT)

| Method · Path | Notes |
|---|---|
| `POST /student/onboarding` | state/exam/qualification/daily-minutes → profile + study plan |
| `GET /student/dashboard` | greeting, countdown, today's plan, continue-watching, streak, current affairs |
| `GET /student/lessons/:id` | published lesson detail + your progress + bookmark state |
| `POST /student/lessons/:id/playback-token` | short-lived **signed** video/PDF URL (free preview open; else `ENTITLEMENT_REQUIRED`) |
| `PATCH /student/lessons/:id/progress` | resume position + percent + completion |
| `POST /student/lessons/:id/bookmark` | toggle bookmark |
| `GET /student/revision` | bookmarks + in-progress lessons |
| `GET /student/current-affairs` | published current affairs feed |

## Test engine (Phase 5)

Question bank & builder (staff):
`GET/POST /staff/questions` (`question.create`) · `POST /staff/questions/import` (`question.import`,
row-level errors) · `POST /staff/questions/versions/:id/submit` · `.../approve` (`content.approve`).
`GET/POST /staff/tests` (`test.create`) · `POST /staff/tests/versions/:id/sections` ·
`POST /staff/tests/sections/:sectionId/questions` (question must be APPROVED) · `.../submit` ·
`.../approve` (`content.approve`) · `.../publish` (`content.publish` + AAL2).

Attempts (student, authenticated):
| Method · Path | Notes |
|---|---|
| `GET /student/tests` | published tests |
| `POST /student/tests/:testVersionId/attempts` | start/resume; returns questions **without** answers; enforces window + attempt limit |
| `PUT /student/attempts/:attemptId/answers/:questionVersionId` | autosave (response, markedForReview, sequenceNo) |
| `POST /student/attempts/:attemptId/submit` | **server-side scoring**; idempotent; auto-submit past expiry |
| `GET /student/attempts/:attemptId/result` | score/accuracy/subject analysis; per-question answers+explanations only when released |

## Payments & entitlements (Phase 6)

| Method · Path | Auth | Notes |
|---|---|---|
| `GET /products` | public | active products/plans |
| `POST /orders` | student | creates Razorpay order (backend); `idempotencyKey` reuses; applies coupon |
| `POST /payments/razorpay/verify` | student | **backend HMAC verify**; marks paid + grants entitlement |
| `POST /webhooks/razorpay` | public (HMAC) | raw-body signature + idempotent (unique event id) → entitlement |
| `GET /student/orders` · `GET /student/entitlements` | student | history / active access |
| `POST /admin/entitlements/grant` | `payment.manage` + AAL2 | admin/scholarship grant |
| `POST /admin/entitlements/:id/revoke` | `payment.manage` + AAL2 | |
| `POST /admin/refunds` | `payment.manage` + AAL2 | full refund revokes entitlement |

Access is granted ONLY via entitlements (never a global isPaid). The student content gate
(`/student/lessons/:id/playback-token`) checks a live, non-expired entitlement for the lesson's
course; free previews stay open; otherwise `ENTITLEMENT_REQUIRED` (402). Invalid signature →
`PAYMENT_SIGNATURE_INVALID`; duplicate webhook → idempotent no-op.

Cross-cutting: pagination (`page`,`pageSize`), rate limiting, idempotency (orders + webhooks),
and API versioning via the `/api/v1` prefix.
