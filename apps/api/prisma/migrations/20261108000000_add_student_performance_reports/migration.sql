-- CreateTable
CREATE TABLE "student_performance_snapshots" (
    "student_id" TEXT NOT NULL,
    "org_id" TEXT,
    "total_attempts" INTEGER NOT NULL DEFAULT 0,
    "total_questions_answered" INTEGER NOT NULL DEFAULT 0,
    "total_correct" INTEGER NOT NULL DEFAULT 0,
    "total_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_max_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_performance_snapshots_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "student_subject_performance" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "org_id" TEXT,
    "attempts_count" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_subject_performance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_performance_snapshots_org_id_idx" ON "student_performance_snapshots"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_subject_performance_student_id_subject_id_key" ON "student_subject_performance"("student_id", "subject_id");

-- CreateIndex
CREATE INDEX "student_subject_performance_org_id_subject_id_idx" ON "student_subject_performance"("org_id", "subject_id");

-- AddForeignKey
ALTER TABLE "student_performance_snapshots" ADD CONSTRAINT "student_performance_snapshots_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_performance_snapshots" ADD CONSTRAINT "student_performance_snapshots_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_subject_performance" ADD CONSTRAINT "student_subject_performance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_subject_performance" ADD CONSTRAINT "student_subject_performance_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_subject_performance" ADD CONSTRAINT "student_subject_performance_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
