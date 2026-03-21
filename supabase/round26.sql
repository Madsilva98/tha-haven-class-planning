-- round26: Allow studio members to view shared clients
-- Run this in the Supabase SQL editor

DROP POLICY IF EXISTS "Studio members view shared clients" ON clients;
CREATE POLICY "Studio members view shared clients" ON clients FOR SELECT
  USING (
    shared_with_studio = true
    AND studio_id IN (
      SELECT studio_id FROM studio_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
