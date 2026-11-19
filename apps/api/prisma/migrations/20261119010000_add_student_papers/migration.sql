-- CreateTable
CREATE TABLE "student_papers" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "exam_id" TEXT,
    "year" INTEGER,
    "asset_id" TEXT NOT NULL,
    "question_count" INTEGER,
    "answer_key" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "student_papers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_paper_attempts" (
    "id" TEXT NOT NULL,
    "paper_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "duration_seconds" INTEGER,
    "answers" JSONB,
    "score" INTEGER,
    "max_score" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),

    CONSTRAINT "student_paper_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_papers_student_id_idx" ON "student_papers"("student_id");

-- CreateIndex
CREATE INDEX "student_paper_attempts_paper_id_idx" ON "student_paper_attempts"("paper_id");

-- CreateIndex
CREATE INDEX "student_paper_attempts_student_id_idx" ON "student_paper_attempts"("student_id");

-- AddForeignKey
ALTER TABLE "student_papers" ADD CONSTRAINT "student_papers_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_papers" ADD CONSTRAINT "student_papers_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_paper_attempts" ADD CONSTRAINT "student_paper_attempts_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "student_papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_paper_attempts" ADD CONSTRAINT "student_paper_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
