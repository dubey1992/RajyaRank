# Staging Acceptance Checklist

Run through this list after **every** staging deployment, before considering it verified. Each item
should be checked by hand in a real browser — this is not something `pnpm test` covers, since it's
about how the whole system behaves together, not one function in isolation.

For an actual deployment run, copy this list into `STAGING_VALIDATION_REPORT.md` and record a
pass/fail (with notes) next to each line — don't just check boxes here.

## Public / marketing

- [ ] Marketing site loads (student site home page)
- [ ] English/Hindi language switching works
- [ ] Courses list loads and shows real data

## Student experience

- [ ] Student login works (phone OTP)
- [ ] Student dashboard loads
- [ ] Video preview works on a lesson
- [ ] PDF preview works on a lesson
- [ ] A quiz/test can be started and submitted
- [ ] Purchased course appears in "My Learning"
- [ ] A student who has **not** paid cannot access paid content
- [ ] An **expired** entitlement blocks content (not just an unpaid one)
- [ ] Logout works
- [ ] Refreshing the browser on a nested page (e.g. `/en/courses/abc123`) does not 404

## Staff / admin experience

- [ ] Admin login works
- [ ] Institute dashboard loads (for an institution-scoped role)
- [ ] Course creation works
- [ ] Content upload works (video/PDF)

## Payments (Razorpay Test Mode only on staging — never live keys)

- [ ] Razorpay Test checkout opens
- [ ] A successful test payment completes and grants access
- [ ] A failed test payment is handled gracefully (clear error, no false access)
- [ ] The payment webhook is received and processed
- [ ] Sending the **same** webhook event twice does **not** create duplicate access/entitlements

## Security / hygiene

- [ ] No secret value is visible anywhere in the browser page source
- [ ] No production credential (real Razorpay live key, real production database URL, etc.) is
      present anywhere in the staging environment
- [ ] `GET /healthz` returns healthy
- [ ] `GET /readyz` returns healthy (confirms database + cache are reachable)
- [ ] Application logs contain no secret values (spot-check a few recent log lines)

## If anything fails

Do not proceed to production. Fix the underlying issue, redeploy to staging, and re-run this
checklist from the top — including the items that already passed, since a fix can sometimes break
something else.
