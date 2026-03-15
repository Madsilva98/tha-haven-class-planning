-- ============================================================
-- Phase 2 — Additional RLS policies
-- Run in Supabase SQL Editor AFTER schema.sql
-- ============================================================

-- 1. Allow any authenticated user to see all studios (needed for join-by-slug)
DROP POLICY IF EXISTS "studios_select" ON studios;
CREATE POLICY "studios_select" ON studios FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 2. Allow studio members to see each other's profiles
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR studio_id IN (
      SELECT studio_id FROM profiles
      WHERE id = auth.uid() AND studio_id IS NOT NULL
    )
  );

-- 3. Allow studio admins to update other members (role changes, removal)
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE
  USING (
    id = auth.uid()
    OR studio_id IN (
      SELECT studio_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin' AND studio_id IS NOT NULL
    )
  );
