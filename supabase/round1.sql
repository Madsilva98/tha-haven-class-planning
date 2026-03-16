-- Allow studio admins to see pending_studio series from their studio
CREATE POLICY IF NOT EXISTS "Admins see pending studio series" ON series
  FOR SELECT TO authenticated
  USING (
    visibility = 'pending_studio'
    AND studio_id = get_my_studio_id()
    AND get_my_role() IN ('admin','studio_owner','super_admin','backoffice_admin')
  );

-- Classes with pending_studio visible to studio admins
CREATE POLICY IF NOT EXISTS "Admins see pending studio classes" ON classes
  FOR SELECT TO authenticated
  USING (
    visibility = 'pending_studio'
    AND studio_id = get_my_studio_id()
    AND get_my_role() IN ('admin','studio_owner','super_admin','backoffice_admin')
  );

-- Class level column
ALTER TABLE classes ADD COLUMN IF NOT EXISTS level TEXT;
