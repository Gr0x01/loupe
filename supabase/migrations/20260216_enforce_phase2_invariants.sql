-- Migration: Enforce Phase 2 invariants
-- 1) lifecycle event checkpoint_id must belong to the same change_id
-- 2) change_checkpoints rows are write-once (no UPDATE)

-- Needed for composite FK from change_lifecycle_events(change_id, checkpoint_id)
ALTER TABLE change_checkpoints
  ADD CONSTRAINT change_checkpoints_change_id_id_key UNIQUE (change_id, id);

-- Replace loose FK (checkpoint_id -> id) with scoped FK (change_id, checkpoint_id)
ALTER TABLE change_lifecycle_events
  DROP CONSTRAINT IF EXISTS change_lifecycle_events_checkpoint_id_fkey;

ALTER TABLE change_lifecycle_events
  ADD CONSTRAINT change_lifecycle_events_checkpoint_matches_change_fkey
  FOREIGN KEY (change_id, checkpoint_id)
  REFERENCES change_checkpoints(change_id, id);

-- Enforce write-once semantics for checkpoint rows
CREATE OR REPLACE FUNCTION prevent_change_checkpoints_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'change_checkpoints rows are immutable; delete + insert for reruns';
END;
$$;

DROP TRIGGER IF EXISTS trg_change_checkpoints_no_update ON change_checkpoints;

CREATE TRIGGER trg_change_checkpoints_no_update
BEFORE UPDATE ON change_checkpoints
FOR EACH ROW
EXECUTE FUNCTION prevent_change_checkpoints_update();

-- Enforce append-only lifecycle event log
CREATE OR REPLACE FUNCTION prevent_change_lifecycle_events_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'change_lifecycle_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_change_lifecycle_events_no_mutation ON change_lifecycle_events;

CREATE TRIGGER trg_change_lifecycle_events_no_mutation
BEFORE UPDATE OR DELETE ON change_lifecycle_events
FOR EACH ROW
EXECUTE FUNCTION prevent_change_lifecycle_events_mutation();
