-- ─── Phase 5 — Export & Client Portal ────────────────────────────────────────

-- 5.1 Share token column on classes
ALTER TABLE classes ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

-- 5.1 RPC function: fetch a shared class (series included) bypassing RLS
-- Called by ShareView with the token from the URL — works for anon users.
CREATE OR REPLACE FUNCTION get_shared_class(p_token TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cls     RECORD;
  ser_ids TEXT[];
  result  JSON;
BEGIN
  SELECT * INTO cls FROM classes WHERE share_token = p_token LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Convert JSONB series_order to TEXT[]
  SELECT ARRAY(SELECT jsonb_array_elements_text(cls.series_order)) INTO ser_ids;

  SELECT json_build_object(
    'id',           cls.id,
    'name',         cls.name,
    'type',         cls.type,
    'date',         cls.date,
    'notes',        cls.notes,
    'series_order', cls.series_order,
    'series', (
      SELECT COALESCE(
        json_agg(row_to_json(s)
          ORDER BY array_position(ser_ids, s.id)
        ),
        '[]'::json
      )
      FROM series s
      WHERE s.id = ANY(ser_ids)
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_shared_class TO anon;
GRANT EXECUTE ON FUNCTION get_shared_class TO authenticated;

-- 5.2 Client role is already supported by the role TEXT column on profiles.
-- Clients are assigned role = 'client' by a studio admin.
-- RLS: clients can read series/classes from their studio (same studio_id).
-- No new policies needed — the existing studio-scoped SELECT policies cover this.
-- The ClientPortal filters to classes created by studio members.
