-- Raw-SQL additions Prisma's schema language cannot express.
-- Apply AFTER `prisma migrate dev`:  psql "$DATABASE_URL" -f prisma/constraints.sql
-- (In CI/prod, fold these into the generated migration's migration.sql.)

-- 1. Case-insensitive, partial-unique verified email / phone.
--    A verified identity must be globally unique; unverified duplicates are allowed
--    (e.g. two people mid-signup), and soft-deleted rows are excluded.
CREATE UNIQUE INDEX IF NOT EXISTS users_verified_email_uq
  ON users (lower(email))
  WHERE email_verified = true AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_verified_phone_uq
  ON users (phone)
  WHERE phone_verified = true AND deleted_at IS NULL;

-- 2. One active assignment per (user, scope, dimensions). Soft-deleted excluded.
CREATE UNIQUE INDEX IF NOT EXISTS staff_assignments_active_uq
  ON staff_assignments (
    user_id, scope,
    COALESCE(state_id, ''), COALESCE(exam_id, ''),
    COALESCE(course_id, ''), COALESCE(subject_id, ''), COALESCE(batch_id, '')
  )
  WHERE deleted_at IS NULL;

-- 3. Audit log is append-only: block UPDATE and DELETE at the database level.
CREATE OR REPLACE FUNCTION audit_logs_block_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only (% not permitted)', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_no_update ON audit_logs;
CREATE TRIGGER audit_logs_no_update
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_block_mutation();
