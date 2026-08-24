-- Institution free trial: TRIAL (real usable access, time-boxed) is distinct
-- from the existing TRIALING (payment-pending, no access) — see
-- OrganizationSubscription/SubscriptionStatus doc comments in schema.prisma.
-- EXPIRED marks a trial that ran out unconverted, distinct from CANCELED
-- (explicit) and PAST_DUE (a paid plan's failed renewal).
ALTER TYPE "SubscriptionStatus" ADD VALUE 'TRIAL';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'EXPIRED';

-- Synthetic "Free Trial" plan backing every TRIAL subscription — reuses the
-- existing maxActiveStudents/maxStaffSeats enforcement (students.service.ts,
-- invitations.service.ts) with zero new limit-check code. active=false hides
-- it from the Head-facing self-serve catalog (BillingService.listActivePlans)
-- while still showing in the Super Admin's full plan list. Not seeded via
-- prisma/seed.ts alone because the production deploy pipeline only runs
-- migrations, never the seed script (see the ALL_INDIA state migration for
-- the same reasoning).
-- updated_at has no DB-level default (only Prisma Client sets it, at write
-- time, on normal application writes) — a raw-SQL INSERT must supply it
-- explicitly or this violates the NOT NULL constraint.
INSERT INTO "subscription_plans" ("id", "code", "name_hi", "name_en", "price_monthly_minor", "price_annual_minor", "max_active_students", "max_staff_seats", "storage_gb", "internal_fee_bps", "external_fee_bps", "active", "sequence", "updated_at")
VALUES ('f4ee7c9a-2a41-4b1e-9c0e-1b7d3a2f6e01', 'FREE_TRIAL', 'निःशुल्क ट्रायल', 'Free Trial', 0, 0, 20, 3, 10, 0, 0, false, 999, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
