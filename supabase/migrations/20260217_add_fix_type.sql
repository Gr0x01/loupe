ALTER TABLE tracked_suggestions
  ADD COLUMN fix_type text DEFAULT 'strategy'
  CHECK (fix_type IN ('copy', 'strategy'));
