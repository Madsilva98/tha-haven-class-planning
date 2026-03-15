-- ============================================================
-- Phase 3 — Onboarding, Invitations, Roles, Backoffice
-- Run in Supabase SQL Editor AFTER phase2.sql
-- ============================================================

-- 1. Add onboarded + settings to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- 2. Invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id  UUID REFERENCES studios NOT NULL,
  code       TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES profiles NOT NULL,
  accepted_by UUID REFERENCES profiles,
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ DEFAULT now() + INTERVAL '30 days'
);
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- 3. Helper function: check if current user is platform admin
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'backoffice_admin')
  );
$$;

-- 4. Invitation policies
CREATE POLICY "invitations_select" ON invitations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "invitations_insert" ON invitations FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'backoffice_admin', 'studio_owner', 'admin')
      AND studio_id IS NOT NULL
    )
    OR is_platform_admin()
  );

CREATE POLICY "invitations_update" ON invitations FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- 5. Broaden profiles SELECT to allow platform admins to see all users
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    is_platform_admin()
    OR id = auth.uid()
    OR studio_id IN (
      SELECT studio_id FROM profiles p2
      WHERE p2.id = auth.uid() AND p2.studio_id IS NOT NULL
    )
  );

-- Allow platform admins to update any profile
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (
    id = auth.uid()
    OR is_platform_admin()
    OR studio_id IN (
      SELECT studio_id FROM profiles p2
      WHERE p2.id = auth.uid() AND p2.role = 'admin' AND p2.studio_id IS NOT NULL
    )
  );

-- 6. Restrict studio creation to platform admins only
DROP POLICY IF EXISTS "studios_insert" ON studios;
CREATE POLICY "studios_insert" ON studios FOR INSERT
  WITH CHECK (is_platform_admin());

-- Allow platform admins to update studios
CREATE POLICY "studios_update" ON studios FOR UPDATE
  USING (is_platform_admin());

-- 7. Set super_admin for the founding user
UPDATE profiles
SET role = 'super_admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'madalena@thehavenpilates.pt'
);
