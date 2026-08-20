-- CreateEnum
CREATE TYPE "MobileAppPlatform" AS ENUM ('ANDROID', 'IOS');

-- CreateEnum
CREATE TYPE "MobileAppReleaseStatus" AS ENUM ('UPLOADING', 'READY', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "mobile_app_releases" (
    "id" TEXT NOT NULL,
    "platform" "MobileAppPlatform" NOT NULL DEFAULT 'ANDROID',
    "version_name" TEXT NOT NULL,
    "version_code" INTEGER NOT NULL,
    "release_notes_hi" TEXT,
    "release_notes_en" TEXT,
    "storage_key" TEXT,
    "size_bytes" INTEGER NOT NULL,
    "status" "MobileAppReleaseStatus" NOT NULL DEFAULT 'UPLOADING',
    "published_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mobile_app_releases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mobile_app_releases_platform_status_idx" ON "mobile_app_releases"("platform", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_app_releases_platform_version_code_key" ON "mobile_app_releases"("platform", "version_code");
