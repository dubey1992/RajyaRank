-- The trial length itself was shortened 30 -> 15 days (see TRIAL_DAYS in
-- invitations.service.ts) to match this banner's promise. Targets the exact
-- row seeded in 20260824100100_add_marketing_banner by its known id, so this
-- is a no-op if a Super Admin has already edited the banner's text since
-- (matched WHERE id = ... AND message_en LIKE the original 30-day copy).
UPDATE "marketing_banners"
SET
  "message_hi" = '🎯 संस्थानों के लिए नया: बिना भुगतान के 15 दिन का निःशुल्क ट्रायल। डेमो का अनुरोध करें या हमें ईमेल करें।',
  "message_en" = '🎯 New for institutions: a free 15-day trial, no payment required. Request a demo or email us to get started.',
  "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = '9d3e6a7c-1f5b-4d2a-8e6c-4b7a2c9f0d31'
  AND "message_en" LIKE '%free 30-day trial%';
