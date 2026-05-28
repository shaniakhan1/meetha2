-- ============================================================
-- Meetha: Add UNIQUE constraint on users.email
-- Run AFTER merge-duplicate-users.sql (duplicates must be
-- gone before this constraint can be applied).
--
-- Also normalises all existing emails to lowercase so the
-- ilike lookup in upsertUser always hits the index.
-- ============================================================

-- 1. Normalise all existing emails to lowercase
UPDATE users SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL;

-- 2. Add a partial unique index (NULL emails are excluded so
--    users who signed up without an email don't block each other)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
  ON users (LOWER(email))
  WHERE email IS NOT NULL;
