-- Individual Content Purchase — lessons, tests, and curated packs sellable
-- on their own, not just whole courses.
--
-- This migration ONLY adds the new enum values. PostgreSQL refuses to use a
-- freshly-added enum value inside the same transaction that added it
-- ("unsafe use of new value of enum type") — and `prisma migrate deploy`
-- runs an entire migration.sql as one transaction. Every statement that
-- references 'LESSON'/'TEST' as a literal (the partial unique indexes, the
-- new Product.kind/testId usage, etc.) must therefore live in the NEXT
-- migration, once this one has committed. See
-- 20261122090001_individual_content_purchase_part2 for the rest.
ALTER TYPE "ProductKind" ADD VALUE 'LESSON';
ALTER TYPE "ProductKind" ADD VALUE 'TEST';
