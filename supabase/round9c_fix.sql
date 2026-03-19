-- Round 9c fix: Update RLS policies to use is_public instead of visibility='public'
-- Run this in the Supabase SQL Editor

-- Series SELECT policy
DROP POLICY IF EXISTS "series_select" ON series;
CREATE POLICY "series_select" ON series FOR SELECT
  USING (
    created_by = auth.uid()
    OR is_public = true
    OR (visibility = 'studio' AND studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid() AND studio_id IS NOT NULL
    ))
    OR (visibility IN ('pending_studio', 'studio') AND studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid() AND studio_id IS NOT NULL
    ))
  );

-- Classes SELECT policy
DROP POLICY IF EXISTS "classes_select" ON classes;
CREATE POLICY "classes_select" ON classes FOR SELECT
  USING (
    created_by = auth.uid()
    OR is_public = true
    OR (visibility = 'studio' AND studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid() AND studio_id IS NOT NULL
    ))
    OR (visibility IN ('pending_studio', 'studio') AND studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid() AND studio_id IS NOT NULL
    ))
  );
