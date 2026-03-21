-- round29: Soft-delete for client sessions (archive instead of hard delete)
-- Run this in the Supabase SQL editor

ALTER TABLE client_sessions ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Allow instructors to update their own sessions (needed for soft-archive)
DROP POLICY IF EXISTS "Instructors update own sessions" ON client_sessions;
CREATE POLICY "Instructors update own sessions" ON client_sessions FOR UPDATE
  USING (auth.uid() = instructor_id) WITH CHECK (auth.uid() = instructor_id);
