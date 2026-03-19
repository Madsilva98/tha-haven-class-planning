-- Round 11: Public studios for Discover page

-- Add is_public column to studios table
ALTER TABLE studios ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Allow anon/authenticated to read public studios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'studios' AND policyname = 'Public studios are visible to everyone'
  ) THEN
    CREATE POLICY "Public studios are visible to everyone"
      ON studios FOR SELECT
      USING (is_public = true);
  END IF;
END $$;
