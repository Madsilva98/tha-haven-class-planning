-- Round 5: Social / Discovery
-- Run this in the Supabase SQL Editor

-- 1. Opt-in discoverability on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- 2. Attribution on copied/shared content
ALTER TABLE series ADD COLUMN IF NOT EXISTS attribution JSONB;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS attribution JSONB;

-- 3. Shares table (direct send between instructors)
CREATE TABLE IF NOT EXISTS shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('series','class')),
  item_id TEXT NOT NULL,
  item_snapshot JSONB NOT NULL,
  message TEXT,
  seen BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS on shares
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shares_select" ON shares
  FOR SELECT USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

CREATE POLICY "shares_insert" ON shares
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "shares_update" ON shares
  FOR UPDATE USING (auth.uid() = to_user_id);

CREATE POLICY "shares_delete" ON shares
  FOR DELETE USING (auth.uid() = to_user_id);

-- 4. Allow reading public classes (series public policy should already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'classes' AND policyname = 'public_classes_select'
  ) THEN
    EXECUTE 'CREATE POLICY "public_classes_select" ON classes FOR SELECT USING (visibility = ''public'')';
  END IF;
END $$;

-- 5. Allow reading public profiles for discovery + SendModal
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'public_profiles_select'
  ) THEN
    EXECUTE 'CREATE POLICY "public_profiles_select" ON profiles FOR SELECT USING (is_public = true OR auth.uid() = id)';
  END IF;
END $$;
