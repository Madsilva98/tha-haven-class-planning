-- round32.sql
-- Standalone movements table + group fields on series and classes

-- ─── MOVEMENTS TABLE ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS movements (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  movement    text        NOT NULL,
  modality    text        NOT NULL,   -- 'reformer' | 'barre' | 'signature'
  notes       text,
  group_name  text,                   -- user-defined group e.g. 'Classical Repertory'
  created_by  uuid        REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  is_archived boolean     DEFAULT false,
  category    text,
  example_url text
);

-- Add new columns if the table already existed without them
ALTER TABLE movements ADD COLUMN IF NOT EXISTS category    text;
ALTER TABLE movements ADD COLUMN IF NOT EXISTS example_url text;

ALTER TABLE movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "movements_select" ON movements;
CREATE POLICY "movements_select" ON movements
  FOR SELECT USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "movements_insert" ON movements;
CREATE POLICY "movements_insert" ON movements
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "movements_update" ON movements;
CREATE POLICY "movements_update" ON movements
  FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "movements_delete" ON movements;
CREATE POLICY "movements_delete" ON movements
  FOR DELETE USING (auth.uid() = created_by);

-- ─── GROUP FIELDS ON SERIES AND CLASSES ──────────────────────────────────────
ALTER TABLE series  ADD COLUMN IF NOT EXISTS series_group text;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_group  text;
