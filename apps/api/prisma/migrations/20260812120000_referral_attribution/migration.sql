ALTER TABLE "users" ADD COLUMN "referred_by_org_id" TEXT;

CREATE INDEX "users_referred_by_org_id_idx" ON "users"("referred_by_org_id");

ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_org_id_fkey" FOREIGN KEY ("referred_by_org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
