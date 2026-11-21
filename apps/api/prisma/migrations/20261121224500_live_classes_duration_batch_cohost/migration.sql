-- AlterTable: attendance duration tracking (Phase 3) — heartbeat timestamp,
-- "duration so far" computed as lastSeenAt - joinedAt, never stored.
ALTER TABLE "live_class_attendance" ADD COLUMN "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: batch display tag (Phase 5, cosmetic only — no access-control
-- change) + co-host record-keeping label (Phase 7, informational only).
ALTER TABLE "live_classes" ADD COLUMN "batch_id" TEXT;
ALTER TABLE "live_classes" ADD COLUMN "co_host_user_id" TEXT;

-- CreateIndex
CREATE INDEX "live_classes_batch_id_idx" ON "live_classes"("batch_id");

-- AddForeignKey
ALTER TABLE "live_classes" ADD CONSTRAINT "live_classes_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_classes" ADD CONSTRAINT "live_classes_co_host_user_id_fkey" FOREIGN KEY ("co_host_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
