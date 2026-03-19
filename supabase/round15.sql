-- Round 15: RLS policies for studios table (insert/update)
-- Without these, authenticated users get "violates row-level security" when creating a studio

-- Allow any authenticated user to create a studio
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'studios' AND policyname = 'studios_insert'
  ) THEN
    CREATE POLICY "studios_insert" ON studios FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Allow studio owners/admins to update their studio settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'studios' AND policyname = 'studios_update'
  ) THEN
    CREATE POLICY "studios_update" ON studios FOR UPDATE USING (
      id IN (
        SELECT studio_id FROM studio_memberships
        WHERE user_id = auth.uid()
          AND status = 'active'
          AND role IN ('owner', 'admin', 'studio_owner')
      )
    );
  END IF;
END $$;
