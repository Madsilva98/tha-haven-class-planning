-- round31: Add ON DELETE CASCADE to foreign keys referencing profiles(id)
-- Fixes "referenced by foreign key constraint" error when deleting a profile
-- Run this in the Supabase SQL editor

-- series.created_by → profiles.id
ALTER TABLE series DROP CONSTRAINT IF EXISTS series_created_by_fkey;
ALTER TABLE series ADD CONSTRAINT series_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- classes.created_by → profiles.id
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_created_by_fkey;
ALTER TABLE classes ADD CONSTRAINT classes_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- client_sessions.instructor_id → profiles.id
ALTER TABLE client_sessions DROP CONSTRAINT IF EXISTS client_sessions_instructor_id_fkey;
ALTER TABLE client_sessions ADD CONSTRAINT client_sessions_instructor_id_fkey
  FOREIGN KEY (instructor_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- clients.instructor_id → profiles.id
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_instructor_id_fkey;
ALTER TABLE clients ADD CONSTRAINT clients_instructor_id_fkey
  FOREIGN KEY (instructor_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- studio_memberships.user_id → profiles.id
ALTER TABLE studio_memberships DROP CONSTRAINT IF EXISTS studio_memberships_user_id_fkey;
ALTER TABLE studio_memberships ADD CONSTRAINT studio_memberships_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
