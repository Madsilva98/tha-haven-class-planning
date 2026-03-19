-- Round 16: Backoffice RLS policies
-- Allow super_admin / backoffice_admin to read and manage all platform data.
-- Uses DO $$ blocks to avoid errors if policies already exist.

-- ─── PROFILES ────────────────────────────────────────────────────────────────

-- Drop old select policy (replacing with one that also allows backoffice)
DROP POLICY IF EXISTS "admin_profiles_select" ON profiles;
CREATE POLICY "admin_profiles_select" ON profiles FOR SELECT USING (
  id = auth.uid()
  OR auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('super_admin','backoffice_admin')
  )
);

-- Allow backoffice to update any profile (role changes, onboarding reset)
DROP POLICY IF EXISTS "admin_profiles_update" ON profiles;
CREATE POLICY "admin_profiles_update" ON profiles FOR UPDATE USING (
  id = auth.uid()
  OR auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('super_admin','backoffice_admin')
  )
);

-- Allow backoffice to delete any profile (user deletion)
DROP POLICY IF EXISTS "admin_profiles_delete" ON profiles;
CREATE POLICY "admin_profiles_delete" ON profiles FOR DELETE USING (
  id = auth.uid()
  OR auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('super_admin','backoffice_admin')
  )
);

-- ─── STUDIO_MEMBERSHIPS ───────────────────────────────────────────────────────

-- Drop old select policy and replace with backoffice-aware version
DROP POLICY IF EXISTS "admin_sm_select" ON studio_memberships;
CREATE POLICY "admin_sm_select" ON studio_memberships FOR SELECT USING (
  user_id = auth.uid()
  OR studio_id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('super_admin','backoffice_admin')
  )
);

-- Allow backoffice to update any membership (approve/change role)
DROP POLICY IF EXISTS "admin_sm_update" ON studio_memberships;
CREATE POLICY "admin_sm_update" ON studio_memberships FOR UPDATE USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('super_admin','backoffice_admin')
  )
  OR studio_id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner','admin','studio_owner')
  )
);

-- Allow backoffice to delete any membership (reject requests)
DROP POLICY IF EXISTS "admin_sm_delete" ON studio_memberships;
CREATE POLICY "admin_sm_delete" ON studio_memberships FOR DELETE USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('super_admin','backoffice_admin')
  )
  OR user_id = auth.uid()
  OR studio_id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner','admin','studio_owner')
  )
);

-- ─── STUDIOS ─────────────────────────────────────────────────────────────────

-- Allow backoffice to read all studios (not just ones they belong to)
DROP POLICY IF EXISTS "admin_studios_select" ON studios;
CREATE POLICY "admin_studios_select" ON studios FOR SELECT USING (
  id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('super_admin','backoffice_admin')
  )
);
