-- Class level column
ALTER TABLE classes ADD COLUMN IF NOT EXISTS level TEXT;

-- RLS: allow studio admins to see pending_studio series from their studio
DO $$ BEGIN
  CREATE POLICY "Admins see pending studio series" ON series
    FOR SELECT TO authenticated
    USING (
      visibility = 'pending_studio'
      AND studio_id = get_my_studio_id()
      AND get_my_role() IN ('admin','studio_owner','super_admin','backoffice_admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS: allow studio admins to see pending_studio classes from their studio
DO $$ BEGIN
  CREATE POLICY "Admins see pending studio classes" ON classes
    FOR SELECT TO authenticated
    USING (
      visibility = 'pending_studio'
      AND studio_id = get_my_studio_id()
      AND get_my_role() IN ('admin','studio_owner','super_admin','backoffice_admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
