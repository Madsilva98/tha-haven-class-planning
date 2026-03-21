-- Round 21: Fix infinite recursion in studio_memberships policies
--
-- round20.sql's sm_select/sm_update/sm_delete used subqueries that read
-- studio_memberships inside a studio_memberships policy → 42P17 recursion.
--
-- Fix: add a SECURITY DEFINER function that reads studio_memberships bypassing
-- RLS, then reference it from the policies instead of a raw subquery.

-- ── SECURITY DEFINER: returns active studio_ids for the current user ──────────
-- SECURITY DEFINER bypasses RLS — no recursive policy evaluation.

CREATE OR REPLACE FUNCTION get_my_active_studio_ids()
  RETURNS uuid[]
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  );
$$;

-- ── DROP AND RECREATE studio_memberships policies ─────────────────────────────

DROP POLICY IF EXISTS "sm_select" ON studio_memberships;
DROP POLICY IF EXISTS "sm_update" ON studio_memberships;
DROP POLICY IF EXISTS "sm_delete" ON studio_memberships;

-- Read: own memberships | other members of same studio | platform admin
CREATE POLICY "sm_select" ON studio_memberships FOR SELECT USING (
  user_id = auth.uid()
  OR is_platform_admin()
  OR studio_id = ANY(get_my_active_studio_ids())
);

-- Update: studio owners/admins in same studio | platform admin
CREATE POLICY "sm_update" ON studio_memberships FOR UPDATE USING (
  is_platform_admin()
  OR (
    studio_id = ANY(get_my_active_studio_ids())
    AND get_my_role() IN ('owner', 'admin', 'studio_owner')
  )
);

-- Delete: own row | studio owners/admins | platform admin
CREATE POLICY "sm_delete" ON studio_memberships FOR DELETE USING (
  is_platform_admin()
  OR user_id = auth.uid()
  OR (
    studio_id = ANY(get_my_active_studio_ids())
    AND get_my_role() IN ('owner', 'admin', 'studio_owner')
  )
);
