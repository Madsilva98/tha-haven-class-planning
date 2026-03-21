-- round22: favorites table for instructor bookmarking in Discover
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS favorites (
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, profile_id)
);

-- RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own favorites
CREATE POLICY "Users manage own favorites"
  ON favorites
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
