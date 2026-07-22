## What does this change?

<!-- One or two sentences. What does a user/staff member notice differently? -->

## Why?

<!-- The reason this change is needed — a bug, a request, a gap found during testing. -->

## How was this tested?

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass locally
- [ ] Verified manually in the browser (describe what you clicked through)

## Checklist

- [ ] No secret values, `.env` files, or credentials are included in this change
- [ ] This targets the `staging` branch (not `main` directly — production changes go
      `feature branch → staging → main`, see `DEPLOYMENT.md`)
