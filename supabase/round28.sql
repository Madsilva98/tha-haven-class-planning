-- round28: Add prop_tags to series for filterable prop metadata
-- Run this in the Supabase SQL editor

ALTER TABLE series ADD COLUMN IF NOT EXISTS prop_tags text[] DEFAULT '{}';
