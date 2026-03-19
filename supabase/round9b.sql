-- Round 9b: Studio rejection history log
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS rejection_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,        -- 'series' or 'class'
  item_name TEXT NOT NULL,
  item_type_value TEXT,           -- reformer / barre / signature
  zones TEXT,                     -- comma-separated zone names (series only)
  level TEXT,                     -- class level (class only)
  comment TEXT,
  rejected_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rejection_log ENABLE ROW LEVEL SECURITY;

-- Studio members can view their studio's log
CREATE POLICY "rejlog_select" ON rejection_log
  FOR SELECT USING (
    studio_id IN (SELECT studio_id FROM profiles WHERE id = auth.uid())
  );

-- Studio members can insert (when rejecting)
CREATE POLICY "rejlog_insert" ON rejection_log
  FOR INSERT WITH CHECK (
    studio_id IN (SELECT studio_id FROM profiles WHERE id = auth.uid())
  );

-- Studio members can delete their studio's entries
CREATE POLICY "rejlog_delete" ON rejection_log
  FOR DELETE USING (
    studio_id IN (SELECT studio_id FROM profiles WHERE id = auth.uid())
  );
