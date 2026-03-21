-- round25: Clients section full redesign
-- Run this in the Supabase SQL editor

-- Link duo session pairs (both records share the same group id)
ALTER TABLE client_sessions ADD COLUMN IF NOT EXISTS session_group_id uuid;

-- Per-series coaching notes per person, used in DuoSessionView table
-- Structure: { "series_id": "coaching note text", ... }
ALTER TABLE client_sessions ADD COLUMN IF NOT EXISTS series_notes jsonb;
