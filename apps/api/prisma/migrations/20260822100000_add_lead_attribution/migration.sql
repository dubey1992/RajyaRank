-- Add first-touch marketing attribution columns to demo_requests and
-- contact_messages, so staff can see which channel (UTM source/medium/
-- campaign, referrer, landing page) produced a given lead. All nullable —
-- a visitor may arrive with no UTM params and no external referrer.
ALTER TABLE "demo_requests"
  ADD COLUMN "utm_source" TEXT,
  ADD COLUMN "utm_medium" TEXT,
  ADD COLUMN "utm_campaign" TEXT,
  ADD COLUMN "referrer_host" TEXT,
  ADD COLUMN "landing_path" TEXT;

ALTER TABLE "contact_messages"
  ADD COLUMN "utm_source" TEXT,
  ADD COLUMN "utm_medium" TEXT,
  ADD COLUMN "utm_campaign" TEXT,
  ADD COLUMN "referrer_host" TEXT,
  ADD COLUMN "landing_path" TEXT;
