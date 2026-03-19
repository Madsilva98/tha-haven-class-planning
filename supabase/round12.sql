-- Round 12: Fix RLS policies for is_public on series and classes
-- After round9c, public visibility moved from visibility='public' to is_public=true
-- The old policies still check visibility='public' so public content is invisible

-- Drop old policies that check visibility='public'
DROP POLICY IF EXISTS "public_classes_select" ON classes;
DROP POLICY IF EXISTS "public_series_select" ON series;

-- Recreate to check is_public=true instead
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'classes' AND policyname = 'public_classes_select_v2'
  ) THEN
    CREATE POLICY "public_classes_select_v2" ON classes FOR SELECT USING (is_public = true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'series' AND policyname = 'public_series_select_v2'
  ) THEN
    CREATE POLICY "public_series_select_v2" ON series FOR SELECT USING (is_public = true);
  END IF;
END $$;
