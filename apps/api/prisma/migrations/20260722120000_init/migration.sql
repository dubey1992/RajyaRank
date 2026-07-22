-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('INVITED', 'PENDING_SETUP', 'ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "UserKind" AS ENUM ('STUDENT', 'STAFF');

-- CreateEnum
CREATE TYPE "RoleKey" AS ENUM ('STUDENT', 'TEACHER', 'QUESTION_SETTER', 'ACADEMIC_REVIEWER', 'CONTENT_ADMIN', 'SUPPORT_AGENT', 'ACADEMIC_HEAD', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AssuranceLevel" AS ENUM ('AAL1', 'AAL2');

-- CreateEnum
CREATE TYPE "IdentityProvider" AS ENUM ('PHONE', 'GOOGLE', 'EMAIL_PASSWORD');

-- CreateEnum
CREATE TYPE "OtpChannel" AS ENUM ('SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('STUDENT_LOGIN', 'STAFF_LOGIN', 'EMAIL_VERIFY', 'PASSWORD_RESET', 'STEP_UP');

-- CreateEnum
CREATE TYPE "MfaType" AS ENUM ('TOTP');

-- CreateEnum
CREATE TYPE "MfaStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AssignmentScope" AS ENUM ('ORG', 'STATE', 'EXAM', 'COURSE', 'SUBJECT', 'BATCH');

-- CreateEnum
CREATE TYPE "AuditResult" AS ENUM ('SUCCESS', 'DENIED', 'FAILED');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'PRIVATE', 'UNLISTED');

-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('VIDEO', 'PDF', 'TEXT', 'QUIZ', 'MIXED');

-- CreateEnum
CREATE TYPE "ContentLanguage" AS ENUM ('HINDI', 'ENGLISH', 'BILINGUAL');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'APPROVED', 'READY_TO_PUBLISH', 'SCHEDULED', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('VIDEO', 'AUDIO', 'IMAGE', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'FAILED', 'QUARANTINED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LessonAssetRole" AS ENUM ('PRIMARY_VIDEO', 'PDF_NOTES', 'ATTACHMENT', 'THUMBNAIL');

-- CreateEnum
CREATE TYPE "ReviewAction" AS ENUM ('SUBMITTED', 'REVIEW_STARTED', 'COMMENT', 'CORRECTION_REQUESTED', 'APPROVED', 'REJECTED', 'SCHEDULED', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED', 'RESUBMITTED');

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CurrentAffairScope" AS ENUM ('NATIONAL', 'BIHAR', 'JHARKHAND');

-- CreateEnum
CREATE TYPE "StudyPlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "PlanItemKind" AS ENUM ('LESSON', 'WEAK_TOPIC_DRILL', 'TEST');

-- CreateEnum
CREATE TYPE "PlanItemStatus" AS ENUM ('PENDING', 'DONE', 'SKIPPED', 'MISSED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'NUMERIC', 'MATCH', 'PASSAGE', 'ASSERTION_REASON');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('DAILY_QUIZ', 'CHAPTER', 'TOPIC', 'SUBJECT', 'SECTIONAL', 'PREVIOUS_YEAR', 'FULL_MOCK', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ResultReleasePolicy" AS ENUM ('IMMEDIATE', 'AFTER_WINDOW', 'MANUAL');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED', 'INVALIDATED');

-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM ('COURSE', 'TEST_SERIES', 'BUNDLE', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "ProductAudience" AS ENUM ('PUBLIC', 'INSTITUTE');

-- CreateEnum
CREATE TYPE "AccessType" AS ENUM ('FREE', 'PAID', 'TRIAL', 'SCHOLARSHIP', 'COUPON', 'ADMIN_GRANTED', 'LIFETIME', 'EXAM_CYCLE', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('CREATED', 'PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED_PARTIAL', 'REFUNDED_FULL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'AUTHORISED', 'PAID', 'FAILED', 'REFUNDED_PARTIAL', 'REFUNDED_FULL', 'DISPUTED');

-- CreateEnum
CREATE TYPE "EntitlementSource" AS ENUM ('PURCHASE', 'PROMOTION', 'ADMIN', 'REFERRAL', 'SCHOLARSHIP', 'COUPON');

-- CreateEnum
CREATE TYPE "EntitlementStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'REFUNDED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PENDING_APPROVAL', 'PROCESSED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('CREATED', 'PROCESSED', 'REVERSED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "KycDocType" AS ENUM ('PAN_CARD', 'ADDRESS_PROOF', 'BANK_PROOF', 'GSTIN_CERTIFICATE', 'OTHER');

-- CreateEnum
CREATE TYPE "DoubtStatus" AS ENUM ('OPEN', 'ASSIGNED', 'ANSWERED', 'RESOLVED', 'REOPENED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('LOGIN_OTP', 'PAYMENT', 'ACCESS_ENTITLEMENT', 'VIDEO_PDF', 'TEST', 'CONTENT_CORRECTION', 'REFUND', 'ACCOUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_ON_STUDENT', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('ALL', 'STUDENTS', 'STAFF');

-- CreateEnum
CREATE TYPE "ContactCategory" AS ENUM ('GENERAL', 'INSTITUTION_PARTNERSHIP', 'STUDENT_SUPPORT', 'PRESS', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('NEW', 'RESOLVED');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('SECURITY', 'PAYMENT', 'COURSE_ACCESS', 'NEW_LESSON', 'TEST_REMINDER', 'DAILY_PLAN', 'DOUBT_ANSWER', 'EXAM_NOTICE', 'EXPIRY', 'SUPPORT', 'CURRENT_AFFAIRS', 'ANNOUNCEMENT', 'CONTENT_WORKFLOW');

-- CreateEnum
CREATE TYPE "OrgMembershipAction" AS ENUM ('JOINED', 'LEFT');

-- CreateEnum
CREATE TYPE "OrgMembershipMethod" AS ENUM ('ACCESS_CODE', 'ADMIN_ENROLL');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'VOID');

-- CreateEnum
CREATE TYPE "StudyContentKind" AS ENUM ('VIDEO', 'PDF', 'TEST', 'PACK');

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "state_id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "title_hi" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "desc_hi" TEXT,
    "desc_en" TEXT,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "org_id" TEXT,
    "course_promise_hi" TEXT,
    "course_promise_en" TEXT,
    "learning_outcomes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommended_daily_study_minutes" INTEGER,
    "expected_completion_days" INTEGER,
    "mastery_threshold_percent" INTEGER DEFAULT 70,
    "prerequisites_hi" TEXT,
    "prerequisites_en" TEXT,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_hi" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "name_hi" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "name_hi" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "name_hi" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "lesson_type" "LessonType" NOT NULL,
    "free_preview" BOOLEAN NOT NULL DEFAULT false,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "current_version_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_versions" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "title_hi" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "summary_hi" TEXT,
    "summary_en" TEXT,
    "estimated_minutes" INTEGER,
    "difficulty" "Difficulty" DEFAULT 'MEDIUM',
    "content_language" "ContentLanguage",
    "change_summary" TEXT,
    "created_by" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "reviewer_id" TEXT,
    "rejection_reason" TEXT,
    "scheduled_for" TIMESTAMP(3),
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "row_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_comments" (
    "id" TEXT NOT NULL,
    "lesson_version_id" TEXT NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "action" "ReviewAction" NOT NULL,
    "body" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 's3',
    "provider_asset_id" TEXT,
    "storage_key" TEXT,
    "embed_url" TEXT,
    "asset_type" "AssetType" NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'UPLOADING',
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER,
    "duration_seconds" INTEGER,
    "checksum" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_assets" (
    "id" TEXT NOT NULL,
    "lesson_version_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "role" "LessonAssetRole" NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "kind" "UserKind" NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING_SETUP',
    "phone" TEXT,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "password_hash" TEXT,
    "display_name" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'hi',
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "failed_logins" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "perm_version" INTEGER NOT NULL DEFAULT 1,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "org_id" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_identities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "IdentityProvider" NOT NULL,
    "provider_uid" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT,
    "state_id" TEXT,
    "target_exam_id" TEXT,
    "qualification" TEXT,
    "daily_study_minutes" INTEGER,
    "target_date" TIMESTAMP(3),
    "preferred_subjects" TEXT[],
    "onboarded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_progress" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "video_position_seconds" INTEGER NOT NULL DEFAULT 0,
    "percent_complete" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "last_accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmarks" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "current_affairs" (
    "id" TEXT NOT NULL,
    "date_for" TIMESTAMP(3) NOT NULL,
    "title_hi" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "body_hi" TEXT NOT NULL,
    "body_en" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "scope" "CurrentAffairScope" NOT NULL DEFAULT 'NATIONAL',
    "source" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_by" TEXT,
    "correction_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "current_affairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_plans" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "course_id" TEXT,
    "target_exam_id" TEXT,
    "status" "StudyPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "daily_minutes_goal" INTEGER NOT NULL,
    "target_date" TIMESTAMP(3),
    "last_regenerated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_items" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "lesson_id" TEXT,
    "topic_id" TEXT,
    "kind" "PlanItemKind" NOT NULL,
    "estimated_minutes" INTEGER NOT NULL DEFAULT 20,
    "status" "PlanItemStatus" NOT NULL DEFAULT 'PENDING',
    "completed_at" TIMESTAMP(3),
    "rescheduled_from_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "chapter_id" TEXT,
    "topic_id" TEXT,
    "exam_id" TEXT,
    "current_version_id" TEXT,
    "duplicate_fingerprint" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_versions" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "type" "QuestionType" NOT NULL,
    "text_hi" TEXT,
    "text_en" TEXT,
    "options" JSONB NOT NULL,
    "correct_answer" JSONB NOT NULL,
    "explanation_hi" TEXT,
    "explanation_en" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "marks" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "negative_marks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source_type" TEXT,
    "exam_year" INTEGER,
    "created_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tests" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "org_id" TEXT,
    "course_id" TEXT,
    "type" "TestType" NOT NULL,
    "title_hi" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "current_version_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_versions" (
    "id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "duration_minutes" INTEGER NOT NULL,
    "negative_marking" BOOLEAN NOT NULL DEFAULT true,
    "randomize_questions" BOOLEAN NOT NULL DEFAULT false,
    "randomize_options" BOOLEAN NOT NULL DEFAULT false,
    "result_release" "ResultReleasePolicy" NOT NULL DEFAULT 'IMMEDIATE',
    "passing_score" INTEGER,
    "available_from" TIMESTAMP(3),
    "available_to" TIMESTAMP(3),
    "attempt_limit" INTEGER,
    "created_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "head_approved_by" TEXT,
    "head_approved_at" TIMESTAMP(3),
    "reviewer_approved_by" TEXT,
    "reviewer_approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_sections" (
    "id" TEXT NOT NULL,
    "test_version_id" TEXT NOT NULL,
    "name_hi" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "test_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_questions" (
    "id" TEXT NOT NULL,
    "test_section_id" TEXT NOT NULL,
    "question_version_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "marks" DOUBLE PRECISION,
    "negative_marks" DOUBLE PRECISION,

    CONSTRAINT "test_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "test_version_id" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "score" DOUBLE PRECISION,
    "max_score" DOUBLE PRECISION NOT NULL,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "incorrect_count" INTEGER NOT NULL DEFAULT 0,
    "unanswered_count" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION,
    "client_session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_answers" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "question_version_id" TEXT NOT NULL,
    "response" JSONB,
    "marked_for_review" BOOLEAN NOT NULL DEFAULT false,
    "sequence_no" INTEGER NOT NULL DEFAULT 0,
    "is_correct" BOOLEAN,
    "awarded" DOUBLE PRECISION,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "kind" "ProductKind" NOT NULL,
    "course_id" TEXT,
    "exam_id" TEXT,
    "title_hi" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "price_minor" INTEGER NOT NULL,
    "original_price_minor" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "validity_days" INTEGER,
    "access_type" "AccessType" NOT NULL DEFAULT 'PAID',
    "audience" "ProductAudience" NOT NULL DEFAULT 'PUBLIC',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" INTEGER NOT NULL,
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "max_redemptions" INTEGER,
    "per_user_limit" INTEGER NOT NULL DEFAULT 1,
    "course_id" TEXT,
    "redeemed_count" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "OrderStatus" NOT NULL DEFAULT 'CREATED',
    "coupon_id" TEXT,
    "provider_order_id" TEXT,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institute_linked_accounts" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "razorpay_account_id" TEXT,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "payouts_enabled" BOOLEAN NOT NULL DEFAULT false,
    "reserve_held_minor" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "legal_business_name" TEXT,
    "pan_enc" TEXT,
    "gstin" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "address_city" TEXT,
    "address_state" TEXT,
    "address_pincode" TEXT,
    "bank_account_number_enc" TEXT,
    "bank_ifsc" TEXT,
    "beneficiary_name" TEXT,
    "kyc_submitted_at" TIMESTAMP(3),
    "kyc_submitted_by" TEXT,
    "kyc_rejection_reason" TEXT,

    CONSTRAINT "institute_linked_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institute_kyc_documents" (
    "id" TEXT NOT NULL,
    "linked_account_id" TEXT NOT NULL,
    "doc_type" "KycDocType" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" TEXT NOT NULL,

    CONSTRAINT "institute_kyc_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "linked_account_id" TEXT NOT NULL,
    "gross_minor" INTEGER NOT NULL,
    "gateway_fee_minor" INTEGER NOT NULL,
    "platform_fee_minor" INTEGER NOT NULL,
    "reserve_minor" INTEGER NOT NULL,
    "net_minor" INTEGER NOT NULL,
    "razorpay_transfer_id" TEXT,
    "status" "TransferStatus" NOT NULL DEFAULT 'CREATED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "provider_payment_id" TEXT,
    "provider_order_id" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "signature_verified_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "raw_metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "provider_event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "course_id" TEXT,
    "source" "EntitlementSource" NOT NULL,
    "status" "EntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
    "access_type" "AccessType" NOT NULL DEFAULT 'PAID',
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3),
    "order_id" TEXT,
    "payment_id" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "reason" TEXT,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "provider_refund_id" TEXT,
    "created_by" TEXT,
    "requested_by" TEXT,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title_hi" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "body_hi" TEXT NOT NULL,
    "body_en" TEXT NOT NULL,
    "audience" "AnnouncementAudience" NOT NULL DEFAULT 'ALL',
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "sent_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "category" "ContactCategory" NOT NULL DEFAULT 'GENERAL',
    "message" TEXT NOT NULL,
    "status" "ContactStatus" NOT NULL DEFAULT 'NEW',
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doubts" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "org_id" TEXT,
    "subject_id" TEXT,
    "lesson_id" TEXT,
    "question_version_id" TEXT,
    "test_version_id" TEXT,
    "body_text" TEXT NOT NULL,
    "image_asset_id" TEXT,
    "status" "DoubtStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_to_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "doubts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doubt_replies" (
    "id" TEXT NOT NULL,
    "doubt_id" TEXT NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "body_text" TEXT NOT NULL,
    "image_asset_id" TEXT,
    "video_asset_id" TEXT,
    "lesson_ref_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doubt_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "org_id" TEXT,
    "category" "TicketCategory" NOT NULL,
    "subject" TEXT NOT NULL,
    "body_text" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_to_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_replies" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "body_text" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "title_hi" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "body_hi" TEXT,
    "body_en" TEXT,
    "data" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "muted_categories" TEXT[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "work_email" TEXT NOT NULL,
    "title" TEXT,
    "invited_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "key" "RoleKey" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "perm_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "is_high_risk" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scope" "AssignmentScope" NOT NULL,
    "org_id" TEXT,
    "state_id" TEXT,
    "exam_id" TEXT,
    "course_id" TEXT,
    "subject_id" TEXT,
    "batch_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "staff_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "states" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_bodies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT NOT NULL,

    CONSTRAINT "exam_bodies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT NOT NULL,
    "exam_body_id" TEXT NOT NULL,
    "state_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "org_id" TEXT,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "refresh_token_hash" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "assurance" "AssuranceLevel" NOT NULL DEFAULT 'AAL1',
    "remembered" BOOLEAN NOT NULL DEFAULT false,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,

    CONSTRAINT "login_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "channel" "OtpChannel" NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "destination" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "consumed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_factors" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "MfaType" NOT NULL DEFAULT 'TOTP',
    "status" "MfaStatus" NOT NULL DEFAULT 'PENDING',
    "secret_enc" TEXT NOT NULL,
    "recovery_enc" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "full_name" TEXT NOT NULL,
    "role_key" "RoleKey" NOT NULL,
    "org_id" TEXT,
    "assignments" JSONB NOT NULL,
    "token_hash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_user_id" TEXT,
    "invited_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "staff_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "access_code" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "head_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_membership_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "action" "OrgMembershipAction" NOT NULL,
    "method" "OrgMembershipMethod" NOT NULL DEFAULT 'ACCESS_CODE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_membership_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_hi" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "price_monthly_minor" INTEGER NOT NULL,
    "price_annual_minor" INTEGER NOT NULL,
    "max_active_students" INTEGER NOT NULL,
    "max_staff_seats" INTEGER NOT NULL,
    "storage_gb" INTEGER NOT NULL,
    "internal_fee_bps" INTEGER NOT NULL,
    "external_fee_bps" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_subscriptions" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "billing_cycle" "BillingCycle" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "razorpay_subscription_id" TEXT,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institution_invoices" (
    "id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "period_label" TEXT NOT NULL,
    "base_plan_minor" INTEGER NOT NULL,
    "add_ons_minor" INTEGER NOT NULL DEFAULT 0,
    "tax_minor" INTEGER NOT NULL DEFAULT 0,
    "total_minor" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "razorpay_invoice_id" TEXT,
    "due_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "institution_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "correlation_id" TEXT,
    "actor_user_id" TEXT,
    "actor_role" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "result" "AuditResult" NOT NULL,
    "reason_code" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "quote_hi" TEXT NOT NULL,
    "quote_en" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "exam_label" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "question_hi" TEXT NOT NULL,
    "question_en" TEXT NOT NULL,
    "answer_hi" TEXT NOT NULL,
    "answer_en" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_content_teasers" (
    "id" TEXT NOT NULL,
    "kind" "StudyContentKind" NOT NULL,
    "title_hi" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "desc_hi" TEXT NOT NULL,
    "desc_en" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "study_content_teasers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title_hi" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "excerpt_hi" TEXT NOT NULL,
    "excerpt_en" TEXT NOT NULL,
    "body_hi" TEXT NOT NULL,
    "body_en" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cover_image_url" TEXT,
    "author_name" TEXT NOT NULL DEFAULT 'Team RajyaRank',
    "seo_title_hi" TEXT,
    "seo_title_en" TEXT,
    "seo_description_hi" TEXT,
    "seo_description_en" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "courses_code_key" ON "courses"("code");

-- CreateIndex
CREATE INDEX "courses_state_id_exam_id_status_idx" ON "courses"("state_id", "exam_id", "status");

-- CreateIndex
CREATE INDEX "courses_org_id_idx" ON "courses"("org_id");

-- CreateIndex
CREATE INDEX "batches_course_id_idx" ON "batches"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "batches_course_id_code_key" ON "batches"("course_id", "code");

-- CreateIndex
CREATE INDEX "subjects_course_id_idx" ON "subjects"("course_id");

-- CreateIndex
CREATE INDEX "chapters_subject_id_idx" ON "chapters"("subject_id");

-- CreateIndex
CREATE INDEX "topics_chapter_id_idx" ON "topics"("chapter_id");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_current_version_id_key" ON "lessons"("current_version_id");

-- CreateIndex
CREATE INDEX "lessons_topic_id_idx" ON "lessons"("topic_id");

-- CreateIndex
CREATE INDEX "lessons_batch_id_idx" ON "lessons"("batch_id");

-- CreateIndex
CREATE INDEX "lesson_versions_status_idx" ON "lesson_versions"("status");

-- CreateIndex
CREATE INDEX "lesson_versions_reviewer_id_idx" ON "lesson_versions"("reviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_versions_lesson_id_version_number_key" ON "lesson_versions"("lesson_id", "version_number");

-- CreateIndex
CREATE INDEX "review_comments_lesson_version_id_created_at_idx" ON "review_comments"("lesson_version_id", "created_at");

-- CreateIndex
CREATE INDEX "media_assets_owner_user_id_status_idx" ON "media_assets"("owner_user_id", "status");

-- CreateIndex
CREATE INDEX "lesson_assets_asset_id_idx" ON "lesson_assets"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_assets_lesson_version_id_asset_id_role_key" ON "lesson_assets"("lesson_version_id", "asset_id", "role");

-- CreateIndex
CREATE INDEX "users_kind_status_idx" ON "users"("kind", "status");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_org_id_idx" ON "users"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_kind_email_key" ON "users"("kind", "email");

-- CreateIndex
CREATE UNIQUE INDEX "users_kind_phone_key" ON "users"("kind", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "user_identities_user_id_idx" ON "user_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_identities_provider_provider_uid_key" ON "user_identities"("provider", "provider_uid");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_user_id_key" ON "student_profiles"("user_id");

-- CreateIndex
CREATE INDEX "lesson_progress_student_id_status_idx" ON "lesson_progress"("student_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_student_id_lesson_id_key" ON "lesson_progress"("student_id", "lesson_id");

-- CreateIndex
CREATE INDEX "bookmarks_student_id_idx" ON "bookmarks"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_student_id_lesson_id_key" ON "bookmarks"("student_id", "lesson_id");

-- CreateIndex
CREATE INDEX "current_affairs_status_date_for_idx" ON "current_affairs"("status", "date_for");

-- CreateIndex
CREATE INDEX "study_plans_student_id_status_idx" ON "study_plans"("student_id", "status");

-- CreateIndex
CREATE INDEX "plan_items_plan_id_scheduled_for_idx" ON "plan_items"("plan_id", "scheduled_for");

-- CreateIndex
CREATE INDEX "plan_items_plan_id_status_idx" ON "plan_items"("plan_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "questions_current_version_id_key" ON "questions"("current_version_id");

-- CreateIndex
CREATE INDEX "questions_subject_id_idx" ON "questions"("subject_id");

-- CreateIndex
CREATE INDEX "questions_duplicate_fingerprint_idx" ON "questions"("duplicate_fingerprint");

-- CreateIndex
CREATE INDEX "question_versions_status_idx" ON "question_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "question_versions_question_id_version_number_key" ON "question_versions"("question_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "tests_current_version_id_key" ON "tests"("current_version_id");

-- CreateIndex
CREATE INDEX "tests_exam_id_idx" ON "tests"("exam_id");

-- CreateIndex
CREATE INDEX "test_versions_status_idx" ON "test_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "test_versions_test_id_version_number_key" ON "test_versions"("test_id", "version_number");

-- CreateIndex
CREATE INDEX "test_sections_test_version_id_idx" ON "test_sections"("test_version_id");

-- CreateIndex
CREATE INDEX "test_questions_question_version_id_idx" ON "test_questions"("question_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "test_questions_test_section_id_question_version_id_key" ON "test_questions"("test_section_id", "question_version_id");

-- CreateIndex
CREATE INDEX "attempts_student_id_status_idx" ON "attempts"("student_id", "status");

-- CreateIndex
CREATE INDEX "attempts_test_version_id_idx" ON "attempts"("test_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "attempt_answers_attempt_id_question_version_id_key" ON "attempt_answers"("attempt_id", "question_version_id");

-- CreateIndex
CREATE INDEX "products_active_idx" ON "products"("active");

-- CreateIndex
CREATE UNIQUE INDEX "products_course_id_kind_audience_key" ON "products"("course_id", "kind", "audience");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "orders_provider_order_id_key" ON "orders"("provider_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- CreateIndex
CREATE INDEX "orders_user_id_status_idx" ON "orders"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "institute_linked_accounts_org_id_key" ON "institute_linked_accounts"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "institute_linked_accounts_razorpay_account_id_key" ON "institute_linked_accounts"("razorpay_account_id");

-- CreateIndex
CREATE INDEX "institute_kyc_documents_linked_account_id_idx" ON "institute_kyc_documents"("linked_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "transfers_order_id_key" ON "transfers"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "transfers_razorpay_transfer_id_key" ON "transfers"("razorpay_transfer_id");

-- CreateIndex
CREATE INDEX "transfers_linked_account_id_status_idx" ON "transfers"("linked_account_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_payment_id_key" ON "payments"("provider_payment_id");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_provider_event_id_key" ON "payment_events"("provider_event_id");

-- CreateIndex
CREATE INDEX "entitlements_user_id_course_id_status_idx" ON "entitlements"("user_id", "course_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "entitlements_user_id_product_id_key" ON "entitlements"("user_id", "product_id");

-- CreateIndex
CREATE INDEX "refunds_payment_id_idx" ON "refunds"("payment_id");

-- CreateIndex
CREATE INDEX "contact_messages_status_created_at_idx" ON "contact_messages"("status", "created_at");

-- CreateIndex
CREATE INDEX "doubts_student_id_idx" ON "doubts"("student_id");

-- CreateIndex
CREATE INDEX "doubts_status_idx" ON "doubts"("status");

-- CreateIndex
CREATE INDEX "doubts_assigned_to_user_id_idx" ON "doubts"("assigned_to_user_id");

-- CreateIndex
CREATE INDEX "doubt_replies_doubt_id_created_at_idx" ON "doubt_replies"("doubt_id", "created_at");

-- CreateIndex
CREATE INDEX "support_tickets_student_id_idx" ON "support_tickets"("student_id");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "ticket_replies_ticket_id_created_at_idx" ON "ticket_replies"("ticket_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_user_id_key" ON "staff_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_work_email_key" ON "staff_profiles"("work_email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE INDEX "staff_assignments_user_id_idx" ON "staff_assignments"("user_id");

-- CreateIndex
CREATE INDEX "staff_assignments_scope_state_id_exam_id_course_id_subject__idx" ON "staff_assignments"("scope", "state_id", "exam_id", "course_id", "subject_id", "batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "states_code_key" ON "states"("code");

-- CreateIndex
CREATE UNIQUE INDEX "exam_bodies_code_key" ON "exam_bodies"("code");

-- CreateIndex
CREATE INDEX "exams_exam_body_id_idx" ON "exams"("exam_body_id");

-- CreateIndex
CREATE UNIQUE INDEX "exams_org_id_code_key" ON "exams"("org_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "login_sessions_refresh_token_hash_key" ON "login_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "login_sessions_user_id_status_idx" ON "login_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "login_sessions_family_id_idx" ON "login_sessions"("family_id");

-- CreateIndex
CREATE INDEX "otp_challenges_destination_purpose_idx" ON "otp_challenges"("destination", "purpose");

-- CreateIndex
CREATE INDEX "otp_challenges_expires_at_idx" ON "otp_challenges"("expires_at");

-- CreateIndex
CREATE INDEX "mfa_factors_user_id_status_idx" ON "mfa_factors"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "staff_invitations_token_hash_key" ON "staff_invitations"("token_hash");

-- CreateIndex
CREATE INDEX "staff_invitations_email_status_idx" ON "staff_invitations"("email", "status");

-- CreateIndex
CREATE INDEX "staff_invitations_status_expires_at_idx" ON "staff_invitations"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_access_code_key" ON "organizations"("access_code");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_head_user_id_key" ON "organizations"("head_user_id");

-- CreateIndex
CREATE INDEX "org_membership_events_user_id_idx" ON "org_membership_events"("user_id");

-- CreateIndex
CREATE INDEX "org_membership_events_org_id_idx" ON "org_membership_events"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "organization_subscriptions_org_id_key" ON "organization_subscriptions"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_subscriptions_razorpay_subscription_id_key" ON "organization_subscriptions"("razorpay_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "institution_invoices_invoice_number_key" ON "institution_invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "institution_invoices_razorpay_invoice_id_key" ON "institution_invoices"("razorpay_invoice_id");

-- CreateIndex
CREATE INDEX "institution_invoices_subscription_id_status_idx" ON "institution_invoices"("subscription_id", "status");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_published_published_at_idx" ON "blog_posts"("published", "published_at");

-- CreateIndex
CREATE INDEX "blog_posts_category_idx" ON "blog_posts"("category");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "lesson_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_versions" ADD CONSTRAINT "lesson_versions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_lesson_version_id_fkey" FOREIGN KEY ("lesson_version_id") REFERENCES "lesson_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_assets" ADD CONSTRAINT "lesson_assets_lesson_version_id_fkey" FOREIGN KEY ("lesson_version_id") REFERENCES "lesson_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_assets" ADD CONSTRAINT "lesson_assets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_target_exam_id_fkey" FOREIGN KEY ("target_exam_id") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "study_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_rescheduled_from_id_fkey" FOREIGN KEY ("rescheduled_from_id") REFERENCES "plan_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "question_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_versions" ADD CONSTRAINT "question_versions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests" ADD CONSTRAINT "tests_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests" ADD CONSTRAINT "tests_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "test_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_versions" ADD CONSTRAINT "test_versions_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_sections" ADD CONSTRAINT "test_sections_test_version_id_fkey" FOREIGN KEY ("test_version_id") REFERENCES "test_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_questions" ADD CONSTRAINT "test_questions_test_section_id_fkey" FOREIGN KEY ("test_section_id") REFERENCES "test_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_questions" ADD CONSTRAINT "test_questions_question_version_id_fkey" FOREIGN KEY ("question_version_id") REFERENCES "question_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_test_version_id_fkey" FOREIGN KEY ("test_version_id") REFERENCES "test_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institute_linked_accounts" ADD CONSTRAINT "institute_linked_accounts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institute_kyc_documents" ADD CONSTRAINT "institute_kyc_documents_linked_account_id_fkey" FOREIGN KEY ("linked_account_id") REFERENCES "institute_linked_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_linked_account_id_fkey" FOREIGN KEY ("linked_account_id") REFERENCES "institute_linked_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doubt_replies" ADD CONSTRAINT "doubt_replies_doubt_id_fkey" FOREIGN KEY ("doubt_id") REFERENCES "doubts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_exam_body_id_fkey" FOREIGN KEY ("exam_body_id") REFERENCES "exam_bodies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_sessions" ADD CONSTRAINT "login_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_factors" ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_head_user_id_fkey" FOREIGN KEY ("head_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_membership_events" ADD CONSTRAINT "org_membership_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_membership_events" ADD CONSTRAINT "org_membership_events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institution_invoices" ADD CONSTRAINT "institution_invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "organization_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

