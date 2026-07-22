# Admin / Super Admin Guide (Phase 1)

## Signing in
Go to `/admin/login`. Enter your work email and password. There is **no role selector** — the system
loads your role and permissions after sign-in. High-risk roles (Super Admin, Content Admin) then enter
a 6-digit code from their authenticator app.

## Inviting staff
Dashboard → **Invite staff**. Enter name, work email, and role. (Assignments — state/exam/course/
subject — can be attached; the API accepts an `assignments` array.) The invitee gets a time-limited
link to set a password and activate. You can **resend** or **revoke** pending invitations.

## Managing staff
- Change status (Active / Suspended / Disabled) — suspending/disabling revokes active sessions
  immediately. Requires MFA (AAL2).
- Change course/subject assignments — takes effect on the next request. Requires MFA.
- Force password reset · revoke all sessions.

## Audit
Every sensitive action (invites, role/assignment/status changes, logins, permission denials) is
recorded in an append-only audit log, visible on the dashboard (`audit.view`).

## Security notes
What you can see in the UI is only a hint — the backend re-checks every action. A blocked action
returns "Access denied" and is recorded. Least privilege applies: Support sees only what a ticket
needs; Teachers/Reviewers/Question Setters cannot publish.
