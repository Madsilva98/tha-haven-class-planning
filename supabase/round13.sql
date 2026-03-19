-- Round 13: Definitive RLS fix for public series/classes
-- Drops ALL existing series_select and classes_select policies and recreates
-- with correct logic (is_public = true, studio_memberships join)

-- Drop all known policy names for series SELECT
DROP POLICY IF EXISTS "series_select" ON series;
DROP POLICY IF EXISTS "public_series_select" ON series;
DROP POLICY IF EXISTS "public_series_select_v2" ON series;

-- Drop all known policy names for classes SELECT
DROP POLICY IF EXISTS "classes_select" ON classes;
DROP POLICY IF EXISTS "public_classes_select" ON classes;
DROP POLICY IF EXISTS "public_classes_select_v2" ON classes;

-- Recreate series SELECT
CREATE POLICY "series_select" ON series FOR SELECT USING (
  created_by = auth.uid()
  OR is_public = true
  OR studio_id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR (visibility IN ('pending_studio', 'studio') AND studio_id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  ))
);

-- Recreate classes SELECT
CREATE POLICY "classes_select" ON classes FOR SELECT USING (
  created_by = auth.uid()
  OR is_public = true
  OR studio_id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR (visibility IN ('pending_studio', 'studio') AND studio_id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  ))
);
