-- CreateEnum
CREATE TYPE "DemoRequestStatus" AS ENUM ('NEW', 'RESOLVED');

-- CreateTable
CREATE TABLE "demo_requests" (
    "id" TEXT NOT NULL,
    "institution_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" TEXT,
    "city" TEXT,
    "student_count" INTEGER,
    "message" TEXT,
    "status" "DemoRequestStatus" NOT NULL DEFAULT 'NEW',
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "demo_requests_status_created_at_idx" ON "demo_requests"("status", "created_at");
