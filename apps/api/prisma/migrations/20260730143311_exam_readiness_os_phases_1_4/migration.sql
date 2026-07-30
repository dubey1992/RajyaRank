-- CreateEnum
CREATE TYPE "MistakeType" AS ENUM ('CONCEPT_GAP', 'MISREAD', 'SLOW_CALCULATION', 'GUESSING');

-- CreateEnum
CREATE TYPE "RatingStatus" AS ENUM ('VISIBLE', 'HIDDEN');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationCategory" ADD VALUE 'NEW_COURSE';
ALTER TYPE "NotificationCategory" ADD VALUE 'NEW_CONTENT';
ALTER TYPE "NotificationCategory" ADD VALUE 'AT_RISK_ALERT';

-- AlterEnum
ALTER TYPE "PlanItemKind" ADD VALUE 'MISTAKE_DRILL';

-- AlterTable
ALTER TABLE "attempt_answers" ADD COLUMN     "mistake_type" "MistakeType",
ADD COLUMN     "time_spent_ms" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "exams" ADD COLUMN     "application_deadline" TIMESTAMP(3),
ADD COLUMN     "exam_date" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "mfa_factors" ADD COLUMN     "last_used_step" INTEGER;

-- AlterTable
ALTER TABLE "plan_items" ADD COLUMN     "concept_id" TEXT,
ADD COLUMN     "trigger_mistake_type" "MistakeType";

-- CreateTable
CREATE TABLE "course_ratings" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" "RatingStatus" NOT NULL DEFAULT 'VISIBLE',
    "report_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlists" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concepts" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "parent_concept_id" TEXT,
    "code" TEXT NOT NULL,
    "name_hi" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "syllabus_version" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_concepts" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "concept_id" TEXT NOT NULL,

    CONSTRAINT "lesson_concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_concepts" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "concept_id" TEXT NOT NULL,

    CONSTRAINT "question_concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_concept_mastery" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "concept_id" TEXT NOT NULL,
    "attempts_count" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "last_practiced_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_concept_mastery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_risk_signals" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "risk_level" "RiskLevel" NOT NULL,
    "flags" TEXT[],
    "inactive_days" INTEGER NOT NULL,
    "plan_adherence_percent" INTEGER,
    "avg_score_recent_percent" INTEGER,
    "avg_score_prior_percent" INTEGER,
    "dominant_mistake_type" "MistakeType",
    "computed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_risk_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "official_notices" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "notice_number" TEXT NOT NULL,
    "published_date" TIMESTAMP(3) NOT NULL,
    "source_url" TEXT,
    "source_asset_id" TEXT,
    "title_hi" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "body_hi" TEXT NOT NULL,
    "body_en" TEXT NOT NULL,
    "proposed_application_deadline" TIMESTAMP(3),
    "proposed_exam_date" TIMESTAMP(3),
    "affected_concept_ids" TEXT[],
    "syllabus_version_tag" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "correction_reason" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "official_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trusted_devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "token_hash" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,

    CONSTRAINT "trusted_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_ratings_course_id_status_idx" ON "course_ratings"("course_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "course_ratings_course_id_user_id_key" ON "course_ratings"("course_id", "user_id");

-- CreateIndex
CREATE INDEX "wishlists_user_id_idx" ON "wishlists"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wishlists_user_id_course_id_key" ON "wishlists"("user_id", "course_id");

-- CreateIndex
CREATE INDEX "concepts_exam_id_idx" ON "concepts"("exam_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_concepts_lesson_id_concept_id_key" ON "lesson_concepts"("lesson_id", "concept_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_concepts_question_id_concept_id_key" ON "question_concepts"("question_id", "concept_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_concept_mastery_student_id_concept_id_key" ON "student_concept_mastery"("student_id", "concept_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_risk_signals_student_id_key" ON "student_risk_signals"("student_id");

-- CreateIndex
CREATE INDEX "student_risk_signals_org_id_risk_level_idx" ON "student_risk_signals"("org_id", "risk_level");

-- CreateIndex
CREATE INDEX "official_notices_exam_id_status_idx" ON "official_notices"("exam_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "trusted_devices_token_hash_key" ON "trusted_devices"("token_hash");

-- CreateIndex
CREATE INDEX "trusted_devices_user_id_status_idx" ON "trusted_devices"("user_id", "status");

-- AddForeignKey
ALTER TABLE "course_ratings" ADD CONSTRAINT "course_ratings_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_ratings" ADD CONSTRAINT "course_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concepts" ADD CONSTRAINT "concepts_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concepts" ADD CONSTRAINT "concepts_parent_concept_id_fkey" FOREIGN KEY ("parent_concept_id") REFERENCES "concepts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_concepts" ADD CONSTRAINT "lesson_concepts_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_concepts" ADD CONSTRAINT "lesson_concepts_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_concepts" ADD CONSTRAINT "question_concepts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_concepts" ADD CONSTRAINT "question_concepts_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_concept_mastery" ADD CONSTRAINT "student_concept_mastery_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_concept_mastery" ADD CONSTRAINT "student_concept_mastery_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_risk_signals" ADD CONSTRAINT "student_risk_signals_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_notices" ADD CONSTRAINT "official_notices_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
