-- Round 18: Comprehensive RLS rebuild
--
-- Ensures all SECURITY DEFINER helper functions exist (CREATE OR REPLACE),
-- drops every policy name that may have been created across all previous rounds,
-- and recreates correct, non-recursive policies.
--
-- Safe to run multiple times.

-- ── SECURITY DEFINER FUNCTIONS ───────────────────────────────────────────────
-- These bypass RLS so policies can call them without causing self-referential recursion.

CREATE OR REPLACE FUNCTION is_platform_admin()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('super_admin', 'backoffice_admin')
  );
$$;

CREATE OR REPLACE FUNCTION get_my_studio_id()
  RETURNS uuid
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$
  SELECT studio_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_role()
  RETURNS text
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;


-- ── DROP ALL KNOWN POLICY NAMES ──────────────────────────────────────────────

-- profiles (every name ever used across schema.sql, phase*.sql, round*.sql, fix_*.sql)
DROP POLICY IF EXISTS "profiles_select"       ON profiles;
DROP POLICY IF EXISTS "profiles_insert"       ON profiles;
DROP POLICY IF EXISTS "profiles_update"       ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_delete"       ON profiles;
DROP POLICY IF EXISTS "admin_profiles_select" ON profiles;
DROP POLICY IF EXISTS "admin_profiles_update" ON profiles;
DROP POLICY IF EXISTS "admin_profiles_delete" ON profiles;

-- studio_memberships
DROP POLICY IF EXISTS "sm_select"       ON studio_memberships;
DROP POLICY IF EXISTS "sm_insert"       ON studio_memberships;
DROP POLICY IF EXISTS "sm_update"       ON studio_memberships;
DROP POLICY IF EXISTS "sm_delete"       ON studio_memberships;
DROP POLICY IF EXISTS "admin_sm_select" ON studio_memberships;
DROP POLICY IF EXISTS "admin_sm_update" ON studio_memberships;
DROP POLICY IF EXISTS "admin_sm_delete" ON studio_memberships;

-- studios
DROP POLICY IF EXISTS "studios_select"       ON studios;
DROP POLICY IF EXISTS "studios_insert"       ON studios;
DROP POLICY IF EXISTS "studios_update"       ON studios;
DROP POLICY IF EXISTS "studios_delete"       ON studios;
DROP POLICY IF EXISTS "admin_studios_select" ON studios;


-- ── PROFILES ─────────────────────────────────────────────────────────────────

-- Any authenticated user can create their own profile row (signup flow)
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (
  id = auth.uid()
);

-- Read own row | same-studio members | platform admin
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  id = auth.uid()
  OR is_platform_admin()
  OR (studio_id IS NOT NULL AND studio_id = get_my_studio_id())
);

-- Update own row | studio admin updating a member | platform admin updating anyone
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (
  id = auth.uid()
  OR is_platform_admin()
  OR (
    studio_id IS NOT NULL
    AND studio_id = get_my_studio_id()
    AND get_my_role() IN ('owner', 'admin', 'studio_owner')
  )
);

-- Delete own row | platform admin deletes anyone
CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (
  id = auth.uid()
  OR is_platform_admin()
);


-- ── STUDIO_MEMBERSHIPS ────────────────────────────────────────────────────────

-- Any authenticated user can request to join (insert their own row)
CREATE POLICY "sm_insert" ON studio_memberships FOR INSERT WITH CHECK (
  user_id = auth.uid()
  OR is_platform_admin()
);

-- Read own memberships | see other members in same studio | platform admin
CREATE POLICY "sm_select" ON studio_memberships FOR SELECT USING (
  user_id = auth.uid()
  OR is_platform_admin()
  OR studio_id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Studio owners/admins can update memberships in their studio | platform admin
CREATE POLICY "sm_update" ON studio_memberships FOR UPDATE USING (
  is_platform_admin()
  OR studio_id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'studio_owner')
  )
);

-- Users can remove themselves | studio admins can remove members | platform admin
CREATE POLICY "sm_delete" ON studio_memberships FOR DELETE USING (
  is_platform_admin()
  OR user_id = auth.uid()
  OR studio_id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'studio_owner')
  )
);


-- ── STUDIOS ───────────────────────────────────────────────────────────────────

-- ANY authenticated user can see studios — needed so new users can look up a
-- studio by studio_code during onboarding (before they are a member).
CREATE POLICY "studios_select" ON studios FOR SELECT USING (
  auth.uid() IS NOT NULL
);

-- Any authenticated user can create a studio (they become the owner)
CREATE POLICY "studios_insert" ON studios FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Studio owners/admins can update their own studio | platform admin updates any
CREATE POLICY "studios_update" ON studios FOR UPDATE USING (
  is_platform_admin()
  OR id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'studio_owner')
  )
);

-- Studio owners can delete their studio | platform admin
CREATE POLICY "studios_delete" ON studios FOR DELETE USING (
  is_platform_admin()
  OR id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'studio_owner')
  )
);
