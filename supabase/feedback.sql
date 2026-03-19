CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_insert" ON feedback FOR INSERT WITH CHECK (user_id = auth.uid());
-- All authenticated users can read all feedback (internal instructor tool)
CREATE POLICY "feedback_select_all" ON feedback FOR SELECT USING (auth.uid() IS NOT NULL);
