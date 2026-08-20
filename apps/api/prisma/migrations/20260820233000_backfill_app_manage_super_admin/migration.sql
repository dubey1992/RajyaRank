-- Data backfill, not a schema change. `permissions`/`role_permissions` rows are
-- normally synced by prisma/seed.ts, but seed.ts is never run against staging/
-- production (see rajyarank-local-run memory) — it's a one-time bootstrap tool,
-- not part of the deploy pipeline. So a brand-new PermissionCode like
-- 'app.manage' (added in packages/auth/src/permissions.ts) never reaches a real
-- environment's `permissions` table on its own, and seed.ts's own "already
-- initialized" guard would skip granting it to SUPER_ADMIN even if seed *were*
-- re-run, since that role already has role_permissions rows in every real
-- environment. This migration is the actual, deploy-pipeline-safe way to land
-- a new permission + its default role grant. Idempotent (ON CONFLICT DO
-- NOTHING), safe to re-run.

INSERT INTO "permissions" ("id", "code", "category", "is_high_risk")
VALUES (gen_random_uuid(), 'app.manage', 'app', true)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r, "permissions" p
WHERE r."key" = 'SUPER_ADMIN' AND p."code" = 'app.manage'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

-- Busts every Super Admin's cached Principal (Redis, keyed by role permVersion,
-- ~300s TTL — see authorization.service.ts) so the new permission is visible
-- immediately after this deploy instead of after the cache naturally expires.
UPDATE "roles" SET "perm_version" = "perm_version" + 1 WHERE "key" = 'SUPER_ADMIN';
