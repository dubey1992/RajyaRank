-- Permanent sales-demo sandbox flag — see the doc comment on
-- Organization.isDemo in schema.prisma. Defaults false so every existing
-- organization is unaffected.
-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "is_demo" BOOLEAN NOT NULL DEFAULT false;
