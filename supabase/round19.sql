-- Round 19: Separate platform-admin access from studio role
--
-- Adds is_platform_admin boolean to profiles so a user can be
-- both a studio owner AND have backoffice access simultaneously.
-- The role column now only controls studio-level access.

-- ── ADD COLUMN ───────────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false;

-- Migrate existing super_admin / backoffice_admin roles
UPDATE profiles
SET is_platform_admin = true
WHERE role IN ('super_admin', 'backoffice_admin');

-- ── UPDATE is_platform_admin() FUNCTION ──────────────────────────────────────
-- Now reads the boolean column instead of checking the role field.
CREATE OR REPLACE FUNCTION is_platform_admin()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_platform_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;
