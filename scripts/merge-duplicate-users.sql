-- ============================================================
-- Meetha: Merge Duplicate User Rows
-- Run this in the Supabase SQL Editor (one-time cleanup).
--
-- Strategy:
--   For every email that has more than one user row, keep the
--   row with the LOWEST id (oldest account) as the canonical
--   record. Reassign all FK references in every child table
--   to the canonical id, then delete the orphan rows.
--
-- Tables with user_id FK:
--   profiles, credits, generations, postability_feedback, referrals
--
-- Safe to run multiple times (idempotent).
-- ============================================================

DO $$
DECLARE
  dup RECORD;
  orphan RECORD;
  canonical_id INT;
BEGIN

  -- Loop over every email that has more than one user row
  FOR dup IN
    SELECT email, MIN(id) AS keep_id
    FROM users
    WHERE email IS NOT NULL
    GROUP BY email
    HAVING COUNT(*) > 1
  LOOP
    canonical_id := dup.keep_id;

    RAISE NOTICE 'Merging duplicates for email=% into user_id=%', dup.email, canonical_id;

    -- Loop over every orphan row (same email, higher id)
    FOR orphan IN
      SELECT id FROM users
      WHERE email = dup.email AND id <> canonical_id
    LOOP
      RAISE NOTICE '  Reassigning orphan user_id=% to canonical_id=%', orphan.id, canonical_id;

      -- profiles (unique on user_id — skip if canonical already has one)
      UPDATE profiles
        SET user_id = canonical_id
        WHERE user_id = orphan.id
          AND NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = canonical_id);
      -- if canonical already has a profile, just delete the orphan profile
      DELETE FROM profiles WHERE user_id = orphan.id;

      -- credits (unique on user_id — merge credits_remaining, keep canonical row)
      UPDATE credits c_canonical
        SET credits_remaining = c_canonical.credits_remaining +
              COALESCE((SELECT credits_remaining FROM credits WHERE user_id = orphan.id), 0),
            total_used = c_canonical.total_used +
              COALESCE((SELECT total_used FROM credits WHERE user_id = orphan.id), 0)
        WHERE c_canonical.user_id = canonical_id;
      -- if canonical has no credits row yet, adopt the orphan's
      UPDATE credits
        SET user_id = canonical_id
        WHERE user_id = orphan.id
          AND NOT EXISTS (SELECT 1 FROM credits WHERE user_id = canonical_id);
      DELETE FROM credits WHERE user_id = orphan.id;

      -- generations (many rows per user — simple reassign)
      UPDATE generations SET user_id = canonical_id WHERE user_id = orphan.id;

      -- postability_feedback (many rows per user — simple reassign)
      UPDATE postability_feedback SET user_id = canonical_id WHERE user_id = orphan.id;

      -- referrals (referrer side)
      UPDATE referrals SET referrer_user_id = canonical_id WHERE referrer_user_id = orphan.id;
      -- referrals (referred side)
      UPDATE referrals SET referred_user_id = canonical_id WHERE referred_user_id = orphan.id;

      -- delete the orphan user row
      DELETE FROM users WHERE id = orphan.id;

      RAISE NOTICE '  Done with orphan user_id=%', orphan.id;
    END LOOP;

  END LOOP;

  RAISE NOTICE 'Merge complete.';
END $$;

-- Verify: should return 0 rows after merge
SELECT email, COUNT(*) as cnt, array_agg(id ORDER BY id) as ids
FROM users
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY cnt DESC;
