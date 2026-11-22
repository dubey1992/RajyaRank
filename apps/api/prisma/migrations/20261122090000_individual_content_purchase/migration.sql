-- Individual Content Purchase — lessons, tests, and curated packs sellable
-- on their own, not just whole courses.

-- AlterEnum
ALTER TYPE "ProductKind" ADD VALUE 'LESSON';
ALTER TYPE "ProductKind" ADD VALUE 'TEST';

-- AlterTable: Product gains lesson/test anchors + a denormalized orgId that
-- replaces threading `product.course?.orgId` through three relation paths.
ALTER TABLE "products" ADD COLUMN "lesson_id" TEXT;
ALTER TABLE "products" ADD COLUMN "test_id" TEXT;
ALTER TABLE "products" ADD COLUMN "org_id" TEXT;

ALTER TABLE "products" ADD CONSTRAINT "products_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "products_lesson_id_idx" ON "products"("lesson_id");
CREATE INDEX "products_test_id_idx" ON "products"("test_id");
CREATE INDEX "products_org_id_idx" ON "products"("org_id");

-- Backfill: every existing COURSE-kind product's orgId from its course, so
-- the new orgId-based KYC/audience/refund/payout checks below don't silently
-- break every already-live institute course the moment this migration runs.
-- Without this, every pre-existing INSTITUTE-audience course product would
-- read orgId as NULL and reject genuine institute-student purchases outright.
UPDATE "products" p
SET "org_id" = c."org_id"
FROM "courses" c
WHERE p."course_id" = c."id" AND p."kind" = 'COURSE' AND c."org_id" IS NOT NULL;

-- Partial unique indexes: Product's existing @@unique([course_id, kind,
-- audience]) does not prevent duplicate LESSON/TEST products for the same
-- content, since Postgres treats every NULL course_id as distinct. These are
-- the real guard, one per content kind (not expressible in Prisma's schema
-- DSL, hence hand-written here).
CREATE UNIQUE INDEX "product_lesson_audience_uq" ON "products"("lesson_id", "audience") WHERE "lesson_id" IS NOT NULL AND "kind" = 'LESSON';
CREATE UNIQUE INDEX "product_test_audience_uq" ON "products"("test_id", "audience") WHERE "test_id" IS NOT NULL AND "kind" = 'TEST';

-- CreateTable: a BUNDLE product's curated items — each item is itself a real
-- LESSON/TEST-kind Product, so granting a bundle purchase can create one
-- ordinary Entitlement per item's own productId (see
-- EntitlementService.grantFromOrder's BUNDLE branch) instead of needing a
-- separate entitlement shape just for bundle members.
CREATE TABLE "product_bundle_items" (
    "id" TEXT NOT NULL,
    "bundle_product_id" TEXT NOT NULL,
    "item_product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_bundle_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_bundle_items_bundle_product_id_item_product_id_key" ON "product_bundle_items"("bundle_product_id", "item_product_id");

ALTER TABLE "product_bundle_items" ADD CONSTRAINT "product_bundle_items_bundle_product_id_fkey" FOREIGN KEY ("bundle_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_bundle_items" ADD CONSTRAINT "product_bundle_items_item_product_id_fkey" FOREIGN KEY ("item_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: Entitlement gains lesson/test anchors, mirroring course_id
-- exactly (plain nullable column, no FK relation object on the Prisma side,
-- matching course_id's own existing convention on this model).
ALTER TABLE "entitlements" ADD COLUMN "lesson_id" TEXT;
ALTER TABLE "entitlements" ADD COLUMN "test_id" TEXT;

CREATE INDEX "entitlements_user_id_lesson_id_status_idx" ON "entitlements"("user_id", "lesson_id", "status");
CREATE INDEX "entitlements_user_id_test_id_status_idx" ON "entitlements"("user_id", "test_id", "status");
