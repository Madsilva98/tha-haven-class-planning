-- Round 9: Instructor profiles + Studio profiles
-- Run this in the Supabase SQL Editor

-- Instructor profile fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Studio profile fields
ALTER TABLE studios ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS contact JSONB DEFAULT '{}';
ALTER TABLE studios ADD COLUMN IF NOT EXISTS logo_url TEXT;
