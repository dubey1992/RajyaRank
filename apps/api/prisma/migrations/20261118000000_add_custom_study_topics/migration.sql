-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN "custom_exam_name" TEXT;

-- AlterEnum
ALTER TYPE "PlanItemKind" ADD VALUE 'CUSTOM';

-- AlterTable
ALTER TABLE "plan_items" ADD COLUMN "custom_topic_id" TEXT;

-- CreateTable
CREATE TABLE "custom_topics" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "module_name" TEXT,
    "name" TEXT NOT NULL,
    "note_text" TEXT,
    "resource_url" TEXT,
    "resource_label" TEXT,
    "estimated_minutes" INTEGER NOT NULL DEFAULT 30,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "custom_topics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_topics_student_id_idx" ON "custom_topics"("student_id");

-- CreateIndex
CREATE INDEX "plan_items_custom_topic_id_idx" ON "plan_items"("custom_topic_id");

-- AddForeignKey
ALTER TABLE "custom_topics" ADD CONSTRAINT "custom_topics_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_custom_topic_id_fkey" FOREIGN KEY ("custom_topic_id") REFERENCES "custom_topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
