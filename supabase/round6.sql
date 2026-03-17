-- Round 6: Studio workflow + Notifications
-- Run this in the Supabase SQL Editor

-- 1. Studio rejection comments
ALTER TABLE series ADD COLUMN IF NOT EXISTS studio_comment TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS studio_comment TEXT;

-- 2. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'series_submitted','class_submitted','series_approved','series_rejected','class_approved','class_rejected'
  title TEXT NOT NULL,
  body TEXT,
  item_type TEXT,      -- 'series' or 'class'
  item_id TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_select" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notif_insert" ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "notif_update" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notif_delete" ON notifications
  FOR DELETE USING (auth.uid() = user_id);
