-- ============================================================
-- The Haven — Supabase Schema + RLS
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Studios
CREATE TABLE studios (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  settings   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name       TEXT,
  studio_id  UUID REFERENCES studios,
  role       TEXT DEFAULT 'instructor', -- 'admin' | 'instructor'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Series
CREATE TABLE series (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL,          -- 'signature' | 'reformer' | 'barre'
  status        TEXT DEFAULT 'testing', -- 'testing' | 'approved'
  song          TEXT,
  intro_cue     TEXT,
  open_cue      TEXT,
  close_cue     TEXT,
  modifications TEXT,
  muscles       JSONB DEFAULT '[]',
  cues          TEXT,
  target_zone   TEXT,
  primary_zone  TEXT,
  reformer      JSONB,
  barre         JSONB,
  video_url     TEXT,
  created_by    UUID REFERENCES profiles,
  studio_id     UUID REFERENCES studios,
  visibility    TEXT DEFAULT 'personal', -- 'personal' | 'studio' | 'public'
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Classes
CREATE TABLE classes (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL,
  date         DATE,
  series_order JSONB DEFAULT '[]',
  notes        TEXT,
  created_by   UUID REFERENCES profiles,
  studio_id    UUID REFERENCES studios,
  visibility   TEXT DEFAULT 'personal',
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- AI style preferences (per user)
CREATE TABLE ai_styles (
  user_id    UUID PRIMARY KEY REFERENCES profiles ON DELETE CASCADE,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Few-shot examples (per user)
CREATE TABLE examples (
  id         BIGINT PRIMARY KEY,
  user_id    UUID REFERENCES profiles ON DELETE CASCADE,
  type       TEXT,      -- 'intro' | 'transition' | 'instructor'
  context    TEXT,
  generated  TEXT,
  final      TEXT,
  accepted   BOOLEAN,
  ts         BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE studios   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE series    ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE examples  ENABLE ROW LEVEL SECURITY;

-- Studios: members see their own studio
CREATE POLICY "studios_select" ON studios FOR SELECT
  USING (id IN (SELECT studio_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "studios_insert" ON studios FOR INSERT
  WITH CHECK (true); -- anyone can create a studio on signup

-- Profiles: users see only their own
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Series: personal + studio + public
CREATE POLICY "series_select" ON series FOR SELECT
  USING (
    created_by = auth.uid()
    OR visibility = 'public'
    OR (visibility = 'studio' AND studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid() AND studio_id IS NOT NULL
    ))
  );

CREATE POLICY "series_insert" ON series FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "series_update" ON series FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "series_delete" ON series FOR DELETE
  USING (created_by = auth.uid());

-- Classes: same pattern
CREATE POLICY "classes_select" ON classes FOR SELECT
  USING (
    created_by = auth.uid()
    OR visibility = 'public'
    OR (visibility = 'studio' AND studio_id IN (
      SELECT studio_id FROM profiles WHERE id = auth.uid() AND studio_id IS NOT NULL
    ))
  );

CREATE POLICY "classes_insert" ON classes FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "classes_update" ON classes FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "classes_delete" ON classes FOR DELETE
  USING (created_by = auth.uid());

-- AI styles: user sees only their own
CREATE POLICY "ai_styles_all" ON ai_styles FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Examples: user sees only their own
CREATE POLICY "examples_all" ON examples FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Storage bucket for videos
-- ============================================================
-- Run this in Supabase Dashboard → Storage → New Bucket:
--   Name: videos
--   Public: true (so video URLs are publicly accessible)
--
-- Then add this storage policy in Dashboard → Storage → Policies:

-- INSERT (authenticated users can upload to their own folder)
-- CREATE POLICY "videos_insert" ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- SELECT (public read)
-- CREATE POLICY "videos_select" ON storage.objects FOR SELECT
--   USING (bucket_id = 'videos');
--
-- DELETE (users can delete their own videos)
-- CREATE POLICY "videos_delete" ON storage.objects FOR DELETE
--   USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
