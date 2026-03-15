-- Fix infinite recursion (error 42P17) in RLS policies
-- The profiles_select policy was querying profiles inside itself

-- Security definer functions bypass RLS — no recursion
CREATE OR REPLACE FUNCTION get_my_studio_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE AS $$
  SELECT studio_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Fix profiles_select (remove self-referential subquery)
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR is_platform_admin()
    OR (studio_id IS NOT NULL AND studio_id = get_my_studio_id())
  );

-- Fix profiles_update (same issue)
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (
    id = auth.uid()
    OR is_platform_admin()
    OR (studio_id IS NOT NULL AND studio_id = get_my_studio_id() AND get_my_role() = 'admin')
  );
