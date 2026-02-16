-- Phase 5: Outcome Feedback Loop
-- Users can thumbs up/down resolved change checkpoint assessments

CREATE TABLE outcome_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_id uuid NOT NULL REFERENCES change_checkpoints(id) ON DELETE CASCADE,
  change_id uuid NOT NULL REFERENCES detected_changes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  feedback_type text NOT NULL CHECK (feedback_type IN ('accurate', 'inaccurate')),
  feedback_text text CHECK (feedback_text IS NULL OR char_length(feedback_text) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Enforce checkpoint actually belongs to the claimed change
  CONSTRAINT outcome_feedback_checkpoint_change_valid
    CHECK (checkpoint_id IS NOT NULL AND change_id IS NOT NULL)
);

-- Validate checkpoint_id belongs to change_id on insert via trigger
-- (composite FK not possible without unique constraint on change_checkpoints(id, change_id))
CREATE OR REPLACE FUNCTION check_outcome_feedback_integrity() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM change_checkpoints WHERE id = NEW.checkpoint_id AND change_id = NEW.change_id
  ) THEN
    RAISE EXCEPTION 'checkpoint_id does not belong to change_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_outcome_feedback_integrity
  BEFORE INSERT ON outcome_feedback
  FOR EACH ROW EXECUTE FUNCTION check_outcome_feedback_integrity();

CREATE UNIQUE INDEX idx_outcome_feedback_unique ON outcome_feedback(checkpoint_id, user_id);
CREATE INDEX idx_outcome_feedback_change ON outcome_feedback(change_id, created_at DESC);
CREATE INDEX idx_outcome_feedback_user ON outcome_feedback(user_id);

ALTER TABLE outcome_feedback ENABLE ROW LEVEL SECURITY;

-- SELECT only: users can read their own feedback
-- No INSERT/UPDATE/DELETE policy: writes are API-only via service client
CREATE POLICY "Users read own" ON outcome_feedback FOR SELECT USING (user_id = auth.uid());
