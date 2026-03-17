-- Round 5 fix: item_id must be TEXT, not UUID
-- Series/class IDs in this app are custom strings (sig-1, s-xxx, c-xxx), not UUIDs
ALTER TABLE shares ALTER COLUMN item_id TYPE TEXT;
