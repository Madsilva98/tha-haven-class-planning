-- round24: Clients section redesign — modality, duo participants, sharing
-- Run this in the Supabase SQL editor

-- Add modality default to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS modality text;

-- Add modality override + participants to client_sessions
ALTER TABLE client_sessions ADD COLUMN IF NOT EXISTS modality text;
ALTER TABLE client_sessions ADD COLUMN IF NOT EXISTS participants jsonb;
-- participants structure:
-- duo:   [{client_id: uuid|null, name: text, series_ids: text[], notes: text}]  (second person)
-- group: [{client_id?: uuid, name: text, notes?: text}]

-- Client sharing table
CREATE TABLE IF NOT EXISTS client_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  to_studio_id uuid REFERENCES studios(id) ON DELETE CASCADE,
  permission text NOT NULL DEFAULT 'view',  -- 'view' | 'edit' | 'transfer'
  created_at timestamptz DEFAULT now(),
  CONSTRAINT client_shares_target CHECK (to_user_id IS NOT NULL OR to_studio_id IS NOT NULL)
);

ALTER TABLE client_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage client shares" ON client_shares;
CREATE POLICY "Owners manage client shares" ON client_shares FOR ALL
  USING (auth.uid() = from_user_id) WITH CHECK (auth.uid() = from_user_id);

DROP POLICY IF EXISTS "Shared users can view" ON client_shares;
CREATE POLICY "Shared users can view" ON client_shares FOR SELECT
  USING (auth.uid() = to_user_id);
