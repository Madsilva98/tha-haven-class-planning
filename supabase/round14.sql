-- Round 14: Fix studio_memberships constraints
-- The original CREATE TABLE IF NOT EXISTS in phase1 is a no-op if the table
-- already existed, meaning neither the role CHECK nor UNIQUE constraints were added.
-- Without UNIQUE(user_id, studio_id), all upsert(onConflict:...) calls fail silently.

-- 1. Fix role CHECK constraint (expand to include all roles the code uses)
ALTER TABLE studio_memberships
  DROP CONSTRAINT IF EXISTS studio_memberships_role_check;

ALTER TABLE studio_memberships
  ADD CONSTRAINT studio_memberships_role_check
  CHECK (role IN ('member', 'instructor', 'admin', 'owner', 'studio_owner'));

-- 2. Ensure UNIQUE(user_id, studio_id) constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'studio_memberships'::regclass
      AND contype = 'u'
      AND conname = 'studio_memberships_user_id_studio_id_key'
  ) THEN
    ALTER TABLE studio_memberships
      ADD CONSTRAINT studio_memberships_user_id_studio_id_key
      UNIQUE (user_id, studio_id);
  END IF;
END $$;
