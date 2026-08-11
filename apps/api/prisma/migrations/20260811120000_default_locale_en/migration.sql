-- Default locale for new users is now English, not Hindi.
-- Existing users' stored locale values are untouched — this only changes
-- what a fresh INSERT gets when no locale is explicitly supplied.
ALTER TABLE "users" ALTER COLUMN "locale" SET DEFAULT 'en';
