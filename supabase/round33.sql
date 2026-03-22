-- round33.sql
-- Add movement_ids to classes (standalone movements in a class)

ALTER TABLE classes ADD COLUMN IF NOT EXISTS movement_ids jsonb DEFAULT '[]'::jsonb;
