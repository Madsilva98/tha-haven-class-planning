-- round34.sql
-- Add level to series; add props + target_zone to movements

ALTER TABLE series    ADD COLUMN IF NOT EXISTS level       text;
ALTER TABLE movements ADD COLUMN IF NOT EXISTS props       text;
ALTER TABLE movements ADD COLUMN IF NOT EXISTS target_zone text;
