-- Round 17: Fix RLS recursion introduced by round16.sql
--
-- round16.sql used self-referential subqueries inside profiles policies
-- (SELECT id FROM profiles WHERE role IN (...) inside a profiles policy)
-- causing infinite recursion (error 42P17) and breaking ALL profile loads.
--
-- Fix: drop the broken policies; use the existing is_platform_admin()
-- SECURITY DEFINER function (defined in phase3.sql) which bypasses RLS.

-- ─── DROP BROKEN POLICIES FROM ROUND16 ───────────────────────────────────────
DROP POLICY IF EXISTS "admin_profiles_select" ON profiles;
DROP POLICY IF EXISTS "admin_profiles_update" ON profiles;
DROP POLICY IF EXISTS "admin_profiles_delete" ON profiles;
DROP POLICY IF EXISTS "admin_sm_select" ON studio_memberships;
DROP POLICY IF EXISTS "admin_sm_update" ON studio_memberships;
DROP POLICY IF EXISTS "admin_sm_delete" ON studio_memberships;
DROP POLICY IF EXISTS "admin_studios_select" ON studios;

-- ─── PROFILES ─────────────────────────────────────────────────────────────────

-- Backoffice can read all profiles (uses is_platform_admin() to avoid recursion)
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  id = auth.uid()
  OR is_platform_admin()
  OR (studio_id IS NOT NULL AND studio_id = get_my_studio_id())
);

-- Backoffice can update any profile (role changes, onboarding reset, deletion)
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (
  id = auth.uid()
  OR is_platform_admin()
  OR (studio_id IS NOT NULL AND studio_id = get_my_studio_id() AND get_my_role() = 'admin')
);

-- Backoffice can delete any profile
DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (
  id = auth.uid()
  OR is_platform_admin()
);

-- ─── STUDIO_MEMBERSHIPS ───────────────────────────────────────────────────────

-- Backoffice can read all memberships
DROP POLICY IF EXISTS "sm_select" ON studio_memberships;
CREATE POLICY "sm_select" ON studio_memberships FOR SELECT USING (
  user_id = auth.uid()
  OR is_platform_admin()
  OR studio_id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Backoffice can update any membership (approve / change role)
DROP POLICY IF EXISTS "sm_update" ON studio_memberships;
CREATE POLICY "sm_update" ON studio_memberships FOR UPDATE USING (
  is_platform_admin()
  OR studio_id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner','admin','studio_owner')
  )
);

-- Backoffice can delete any membership (reject requests)
DROP POLICY IF EXISTS "sm_delete" ON studio_memberships;
CREATE POLICY "sm_delete" ON studio_memberships FOR DELETE USING (
  is_platform_admin()
  OR user_id = auth.uid()
  OR studio_id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner','admin','studio_owner')
  )
);

-- ─── STUDIOS ──────────────────────────────────────────────────────────────────

-- Backoffice can read all studios
DROP POLICY IF EXISTS "studios_select" ON studios;
CREATE POLICY "studios_select" ON studios FOR SELECT USING (
  is_platform_admin()
  OR id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);
