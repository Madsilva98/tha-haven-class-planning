-- Round 9c: Decouple public/private from studio state + soft-delete for studio items
-- Run this in the Supabase SQL Editor

-- 1. Separate is_public from visibility on series
ALTER TABLE series ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- 2. Separate is_public from visibility on classes
ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- 3. Migrate existing public records (visibility='public' → is_public=true + visibility='personal')
UPDATE series SET is_public = true WHERE visibility = 'public';
UPDATE series SET visibility = 'personal' WHERE visibility = 'public';
UPDATE classes SET is_public = true WHERE visibility = 'public';
UPDATE classes SET visibility = 'personal' WHERE visibility = 'public';

-- 4. Soft-delete: instructor marked item for deletion but studio still has it
ALTER TABLE series ADD COLUMN IF NOT EXISTS deleted_by_instructor BOOLEAN DEFAULT false;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS deleted_by_instructor BOOLEAN DEFAULT false;
