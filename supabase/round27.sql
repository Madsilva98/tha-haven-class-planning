-- round27: Allow platform admins to manage public visibility of any content
-- Run this in the Supabase SQL editor

-- Helper function (avoids recursion when used on profiles table)
CREATE OR REPLACE FUNCTION is_any_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (is_platform_admin = true OR role IN ('super_admin', 'backoffice_admin'))
  );
$$;

-- Series: admins can set is_public=false on any series
DROP POLICY IF EXISTS "Platform admins manage series visibility" ON series;
CREATE POLICY "Platform admins manage series visibility" ON series FOR UPDATE
  USING (is_any_admin())
  WITH CHECK (is_any_admin());

-- Classes: admins can set is_public=false on any class
DROP POLICY IF EXISTS "Platform admins manage class visibility" ON classes;
CREATE POLICY "Platform admins manage class visibility" ON classes FOR UPDATE
  USING (is_any_admin())
  WITH CHECK (is_any_admin());

-- Profiles: admins can set is_public=false on any profile
DROP POLICY IF EXISTS "Platform admins manage profile visibility" ON profiles;
CREATE POLICY "Platform admins manage profile visibility" ON profiles FOR UPDATE
  USING (is_any_admin())
  WITH CHECK (is_any_admin());

-- Studios: admins can set is_public=false on any studio
DROP POLICY IF EXISTS "Platform admins manage studio visibility" ON studios;
CREATE POLICY "Platform admins manage studio visibility" ON studios FOR UPDATE
  USING (is_any_admin())
  WITH CHECK (is_any_admin());
