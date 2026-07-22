# Permission Matrix

Authorization = **role capability + assignment scope + ownership + content status + account status +
session assurance**, evaluated by the central engine (`packages/auth/src/policy.engine.ts`). Role
name alone never grants access. `✓ = granted`, `own = only owned + editable status`, `AAL2 = requires MFA-verified session`, `—  = denied`.

| Permission | Teacher | Question Setter | Reviewer | Content Admin | Support | Super Admin |
|---|---|---|---|---|---|---|
| content.create | ✓ (scope) | — | — | ✓ | — | ✓ |
| content.edit_own | own | own | — | — | — | ✓ |
| content.edit_all | — | — | — | ✓ | — | ✓ |
| content.submit_review | ✓ | — | — | ✓ | — | ✓ |
| content.review | — | — | ✓ | ✓ | — | ✓ |
| content.approve | — | — | ✓ | ✓ | — | ✓ |
| content.publish | — | — | — | ✓ (AAL2) | — | ✓ (AAL2) |
| content.unpublish | — | — | — | ✓ (AAL2) | — | ✓ (AAL2) |
| content.archive | — | — | — | ✓ (AAL2) | — | ✓ (AAL2) |
| question.create | ✓ | ✓ | — | ✓ | — | ✓ |
| question.import | — | ✓ | — | ✓ | — | ✓ |
| test.create | ✓ | ✓ | — | ✓ | — | ✓ |
| course.manage | — | — | — | ✓ | — | ✓ |
| assignment.manage | — | — | — | ✓ (AAL2) | — | ✓ (AAL2) |
| user.invite | — | — | — | ✓ | — | ✓ |
| user.disable | — | — | — | — | — | ✓ (AAL2) |
| user.manage | — | — | — | — | — | ✓ |
| role.manage | — | — | — | — | — | ✓ |
| payment.status_view | — | — | — | — | ✓ | ✓ |
| payment.manage | — | — | — | — | — | ✓ (AAL2) |
| support.manage | — | — | — | — | ✓ | ✓ |
| audit.view | — | — | — | — | — | ✓ |

**Scope rule (broader covers narrower):** a `STATE` assignment covers any resource in that state; a
`SUBJECT` assignment must match state+exam+course+subject. Global endpoints (e.g. `user.invite`) have
no resource scope and depend only on the permission code.

**Content-status gate** (data-driven, `STATUS_ALLOWS` in the engine; filled out in Phase 3):
`edit_own` → DRAFT/CORRECTION_REQUIRED · `review` → SUBMITTED/UNDER_REVIEW · `approve` → UNDER_REVIEW
· `publish` → APPROVED/READY_TO_PUBLISH/SCHEDULED · `unpublish` → PUBLISHED.

**Enforcement:** `@RequirePermission(code, { assurance })` + `@ResourceFrom(resolver)` on controllers;
the `PermissionsGuard` calls the engine and, on denial, writes `AuditLog(result=DENIED,
reasonCode=PERMISSION_DENIED)` and returns HTTP 403. Frontend hints (`apps/admin/lib/permissions.ts`)
are UX only.
