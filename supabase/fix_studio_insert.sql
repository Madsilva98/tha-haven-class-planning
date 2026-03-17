-- Allow any authenticated user to create a studio
-- (they become the admin of their own studio)
DROP POLICY IF EXISTS "studios_insert" ON studios;
CREATE POLICY "studios_insert" ON studios FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
