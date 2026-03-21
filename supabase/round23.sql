-- round23: PT client profiles and sessions
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  studio_id uuid REFERENCES studios(id),
  name text NOT NULL,
  contact text,
  objectives text,
  notes text,
  shared_with_studio boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES profiles(id),
  date date,
  type text,  -- 'pt' | 'duo' | 'group'
  series_ids text[],
  class_id text REFERENCES classes(id),
  session_notes text,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Instructors manage own clients" ON clients;
DROP POLICY IF EXISTS "Instructors manage own sessions" ON client_sessions;

CREATE POLICY "Instructors manage own clients"
  ON clients FOR ALL
  USING (auth.uid() = instructor_id)
  WITH CHECK (auth.uid() = instructor_id);

CREATE POLICY "Instructors manage own sessions"
  ON client_sessions FOR ALL
  USING (auth.uid() = instructor_id)
  WITH CHECK (auth.uid() = instructor_id);
