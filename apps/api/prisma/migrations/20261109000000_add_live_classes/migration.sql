-- AlterEnum
ALTER TYPE "NotificationCategory" ADD VALUE 'LIVE_CLASS';

-- CreateEnum
CREATE TYPE "LiveClassStatus" AS ENUM ('SCHEDULED', 'CANCELLED');

-- CreateTable
CREATE TABLE "live_classes" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "org_id" TEXT,
    "host_user_id" TEXT NOT NULL,
    "title_hi" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "description_hi" TEXT,
    "description_en" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "embed_url" TEXT NOT NULL,
    "status" "LiveClassStatus" NOT NULL DEFAULT 'SCHEDULED',
    "published_lesson_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "live_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_class_attendance" (
    "id" TEXT NOT NULL,
    "live_class_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_class_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "live_classes_published_lesson_id_key" ON "live_classes"("published_lesson_id");

-- CreateIndex
CREATE INDEX "live_classes_course_id_starts_at_idx" ON "live_classes"("course_id", "starts_at");

-- CreateIndex
CREATE INDEX "live_classes_org_id_starts_at_idx" ON "live_classes"("org_id", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "live_class_attendance_live_class_id_student_id_key" ON "live_class_attendance"("live_class_id", "student_id");

-- AddForeignKey
ALTER TABLE "live_classes" ADD CONSTRAINT "live_classes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_classes" ADD CONSTRAINT "live_classes_host_user_id_fkey" FOREIGN KEY ("host_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_classes" ADD CONSTRAINT "live_classes_published_lesson_id_fkey" FOREIGN KEY ("published_lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_class_attendance" ADD CONSTRAINT "live_class_attendance_live_class_id_fkey" FOREIGN KEY ("live_class_id") REFERENCES "live_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_class_attendance" ADD CONSTRAINT "live_class_attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
