-- CreateTable
CREATE TABLE "personal_quizzes" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "custom_topic_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "personal_quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_quiz_questions" (
    "id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "text" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct_answer" JSONB NOT NULL,
    "explanation" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "generated_by_ai" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_quiz_attempts" (
    "id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "answers" JSONB,
    "score" DOUBLE PRECISION,
    "max_score" DOUBLE PRECISION NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),

    CONSTRAINT "personal_quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "personal_quizzes_student_id_idx" ON "personal_quizzes"("student_id");

-- CreateIndex
CREATE INDEX "personal_quiz_questions_quiz_id_idx" ON "personal_quiz_questions"("quiz_id");

-- CreateIndex
CREATE INDEX "personal_quiz_attempts_quiz_id_idx" ON "personal_quiz_attempts"("quiz_id");

-- CreateIndex
CREATE INDEX "personal_quiz_attempts_student_id_idx" ON "personal_quiz_attempts"("student_id");

-- AddForeignKey
ALTER TABLE "personal_quizzes" ADD CONSTRAINT "personal_quizzes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_quizzes" ADD CONSTRAINT "personal_quizzes_custom_topic_id_fkey" FOREIGN KEY ("custom_topic_id") REFERENCES "custom_topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_quiz_questions" ADD CONSTRAINT "personal_quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "personal_quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_quiz_attempts" ADD CONSTRAINT "personal_quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "personal_quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_quiz_attempts" ADD CONSTRAINT "personal_quiz_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
