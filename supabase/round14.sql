-- Round 14: Fix studio_memberships role CHECK constraint
-- Original constraint only allowed ('member', 'admin', 'owner')
-- but code inserts 'instructor' and 'studio_owner' roles, causing silent failures

ALTER TABLE studio_memberships
  DROP CONSTRAINT IF EXISTS studio_memberships_role_check;

ALTER TABLE studio_memberships
  ADD CONSTRAINT studio_memberships_role_check
  CHECK (role IN ('member', 'instructor', 'admin', 'owner', 'studio_owner'));
