-- CreateTable
CREATE TABLE "previous_year_papers" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "org_id" TEXT,
    "title_hi" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "asset_id" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "previous_year_papers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "previous_year_papers_exam_id_idx" ON "previous_year_papers"("exam_id");

-- CreateIndex
CREATE INDEX "previous_year_papers_org_id_idx" ON "previous_year_papers"("org_id");

-- AddForeignKey
ALTER TABLE "previous_year_papers" ADD CONSTRAINT "previous_year_papers_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "previous_year_papers" ADD CONSTRAINT "previous_year_papers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "previous_year_papers" ADD CONSTRAINT "previous_year_papers_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
