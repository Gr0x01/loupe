-- Migration: tracked_suggestions
-- Persistent suggestions that survive across scans.
-- Part of Canonical Change Intelligence (RFC-0001, Phase 2).

CREATE TABLE tracked_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  element text NOT NULL,
  suggested_fix text NOT NULL,
  impact text NOT NULL CHECK (impact IN ('high', 'medium', 'low')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'addressed', 'dismissed')),
  times_suggested int NOT NULL DEFAULT 1,
  first_suggested_at timestamptz NOT NULL DEFAULT now(),
  addressed_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tracked_suggestions_page_user ON tracked_suggestions(page_id, user_id);
CREATE INDEX idx_tracked_suggestions_open ON tracked_suggestions(status) WHERE status = 'open';
CREATE INDEX idx_tracked_suggestions_user_id ON tracked_suggestions(user_id);

-- RLS: users can only access their own suggestions
ALTER TABLE tracked_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own suggestions"
  ON tracked_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own suggestions"
  ON tracked_suggestions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage suggestions"
  ON tracked_suggestions FOR ALL
  USING (auth.role() = 'service_role');
