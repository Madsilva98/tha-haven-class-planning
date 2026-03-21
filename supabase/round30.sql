-- round30: Restore INSERT/UPDATE/DELETE policies for series and classes
-- Run this in the Supabase SQL editor
-- Fixes "new row violates row level security policy for table series"

-- Series
DROP POLICY IF EXISTS "series_insert" ON series;
CREATE POLICY "series_insert" ON series FOR INSERT
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "series_update" ON series;
CREATE POLICY "series_update" ON series FOR UPDATE
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "series_delete" ON series;
CREATE POLICY "series_delete" ON series FOR DELETE
  USING (created_by = auth.uid());

-- Classes (same pattern, in case they have the same issue)
DROP POLICY IF EXISTS "classes_insert" ON classes;
CREATE POLICY "classes_insert" ON classes FOR INSERT
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "classes_update" ON classes;
CREATE POLICY "classes_update" ON classes FOR UPDATE
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "classes_delete" ON classes;
CREATE POLICY "classes_delete" ON classes FOR DELETE
  USING (created_by = auth.uid());
