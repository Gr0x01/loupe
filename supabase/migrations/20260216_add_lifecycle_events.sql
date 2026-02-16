-- Migration: change_lifecycle_events
-- Immutable audit log of every status transition on detected_changes.
-- Part of Canonical Change Intelligence (RFC-0001, Phase 2).

CREATE TABLE change_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id uuid NOT NULL REFERENCES detected_changes(id) ON DELETE CASCADE,
  from_status text NOT NULL CHECK (from_status IN ('watching', 'validated', 'regressed', 'inconclusive', 'reverted')),
  to_status text NOT NULL CHECK (to_status IN ('watching', 'validated', 'regressed', 'inconclusive', 'reverted')),
  reason text NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('system', 'user', 'llm')),
  actor_id text,
  checkpoint_id uuid REFERENCES change_checkpoints(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- RFC invariant: system-triggered transitions must link to checkpoint evidence
  CHECK (actor_type != 'system' OR checkpoint_id IS NOT NULL)
);

CREATE INDEX idx_lifecycle_events_change_created ON change_lifecycle_events(change_id, created_at DESC);

-- RLS: system-only table (service role bypasses RLS; enabling RLS blocks client access)
ALTER TABLE change_lifecycle_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON change_lifecycle_events FOR ALL
  USING (auth.role() = 'service_role');
