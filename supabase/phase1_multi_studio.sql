-- Phase 1: Multi-studio memberships + studio notices
-- Run this in the Supabase SQL Editor

-- ============================================================
-- 1. studio_memberships table
-- ============================================================
CREATE TABLE IF NOT EXISTS studio_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'owner')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, studio_id)
);

ALTER TABLE studio_memberships ENABLE ROW LEVEL SECURITY;

-- Members can see their own memberships + all memberships in studios they belong to
CREATE POLICY "sm_select" ON studio_memberships FOR SELECT USING (
  user_id = auth.uid()
  OR studio_id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Users can request to join (insert their own pending membership)
CREATE POLICY "sm_insert_own" ON studio_memberships FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

-- Studio owners can update membership (approve, change role)
CREATE POLICY "sm_update_owner" ON studio_memberships FOR UPDATE USING (
  studio_id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid() AND status = 'active' AND role = 'owner'
  )
);

-- Users can leave (delete own), owners can remove others
CREATE POLICY "sm_delete" ON studio_memberships FOR DELETE USING (
  user_id = auth.uid()
  OR studio_id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid() AND status = 'active' AND role = 'owner'
  )
);

-- ============================================================
-- 2. Migrate existing studio connections from profiles
-- ============================================================
INSERT INTO studio_memberships (user_id, studio_id, role, status)
SELECT
  p.id,
  p.studio_id,
  CASE WHEN p.role IN ('admin', 'owner') THEN p.role ELSE 'member' END,
  'active'
FROM profiles p
WHERE p.studio_id IS NOT NULL
ON CONFLICT (user_id, studio_id) DO NOTHING;

-- ============================================================
-- 3. studio_notices table
-- ============================================================
CREATE TABLE IF NOT EXISTS studio_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE studio_notices ENABLE ROW LEVEL SECURITY;

-- Active members can view their studio's notices
CREATE POLICY "notices_select" ON studio_notices FOR SELECT USING (
  studio_id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Admins and owners can post notices
CREATE POLICY "notices_insert" ON studio_notices FOR INSERT WITH CHECK (
  studio_id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'owner')
  )
);

-- Admins and owners can delete notices
CREATE POLICY "notices_delete" ON studio_notices FOR DELETE USING (
  studio_id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'owner')
  )
);

-- ============================================================
-- 4. Add studio_id join column to existing RLS policies
--    (series and classes already have studio_id; update their
--     SELECT policies to also check studio_memberships so that
--     multi-studio members can see content from all their studios)
-- ============================================================

-- Update series SELECT policy to check studio_memberships
DROP POLICY IF EXISTS "series_select" ON series;
CREATE POLICY "series_select" ON series FOR SELECT USING (
  created_by = auth.uid()
  OR is_public = true
  OR studio_id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Update classes SELECT policy to check studio_memberships
DROP POLICY IF EXISTS "classes_select" ON classes;
CREATE POLICY "classes_select" ON classes FOR SELECT USING (
  created_by = auth.uid()
  OR is_public = true
  OR studio_id IN (
    SELECT studio_id FROM studio_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- ============================================================
-- 5. Helper: studio_code column on studios (replaces slug for
--    human-readable join codes like HVN4KR)
-- ============================================================
ALTER TABLE studios ADD COLUMN IF NOT EXISTS studio_code TEXT UNIQUE;

-- Populate existing studios with a code based on their slug
UPDATE studios SET studio_code = UPPER(LEFT(REPLACE(slug, '-', ''), 6))
WHERE studio_code IS NULL AND slug IS NOT NULL;

-- Generate a random code for any remaining studios
UPDATE studios SET studio_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6))
WHERE studio_code IS NULL;
