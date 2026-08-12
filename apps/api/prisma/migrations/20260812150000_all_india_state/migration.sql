-- "All India" isn't a real state — it's the Set Goal / onboarding State
-- dropdown's option for "I'm preparing for a national exam, not a
-- state-specific one" (matched by code from the frontend, see
-- apps/web/components/StudyGoalsForm.tsx and app/[locale]/onboarding/page.tsx).
-- Added here (not just prisma/seed.ts's seedReference()) because the
-- production deploy pipeline only runs migrations, never the seed script.
INSERT INTO "states" ("id", "code", "name_en", "name_hi")
VALUES ('68186b9d-d906-41db-a863-655722a215f1', 'ALL_INDIA', 'All India', 'अखिल भारत')
ON CONFLICT ("code") DO NOTHING;
