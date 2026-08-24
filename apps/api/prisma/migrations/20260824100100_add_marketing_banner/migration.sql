-- Singleton row, edited (never listed) by Super Admin — see
-- MarketingService.getBanner()/updateBanner(). Powers the animated top
-- announcement bar on the public marketing homepage, replacing what was
-- previously a hardcoded string in apps/web/app/[locale]/page.tsx.
CREATE TABLE "marketing_banners" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "message_hi" TEXT NOT NULL,
    "message_en" TEXT NOT NULL,
    "cta_label_hi" TEXT,
    "cta_label_en" TEXT,
    "cta_href" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "marketing_banners_pkey" PRIMARY KEY ("id")
);

-- Seeded enabled, promoting the new institution free trial — not seeded via
-- prisma/seed.ts alone because the production deploy pipeline only runs
-- migrations, never the seed script (see the ALL_INDIA state migration for
-- the same reasoning).
INSERT INTO "marketing_banners" ("id", "enabled", "message_hi", "message_en", "cta_label_hi", "cta_label_en", "cta_href", "updated_at")
VALUES (
  '9d3e6a7c-1f5b-4d2a-8e6c-4b7a2c9f0d31',
  true,
  '🎯 संस्थानों के लिए नया: बिना भुगतान के 30 दिन का निःशुल्क ट्रायल। डेमो का अनुरोध करें या हमें ईमेल करें।',
  '🎯 New for institutions: a free 30-day trial, no payment required. Request a demo or email us to get started.',
  'डेमो का अनुरोध करें',
  'Request a demo',
  '/request-demo',
  CURRENT_TIMESTAMP
);
