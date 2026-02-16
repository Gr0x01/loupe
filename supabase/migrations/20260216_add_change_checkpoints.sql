-- Migration: change_checkpoints
-- Immutable per-change horizon outcomes. One row per change per horizon.
-- Part of Canonical Change Intelligence (RFC-0001, Phase 2).

CREATE TABLE change_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id uuid NOT NULL REFERENCES detected_changes(id) ON DELETE CASCADE,
  horizon_days int NOT NULL CHECK (horizon_days IN (7, 14, 30, 60, 90)),
  window_before_start timestamptz NOT NULL,
  window_before_end timestamptz NOT NULL,
  window_after_start timestamptz NOT NULL,
  window_after_end timestamptz NOT NULL,
  metrics_json jsonb NOT NULL DEFAULT '{}',
  assessment text NOT NULL CHECK (assessment IN ('improved', 'regressed', 'neutral', 'inconclusive')),
  confidence numeric(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  provider text NOT NULL DEFAULT 'none' CHECK (provider IN ('posthog', 'ga4', 'supabase', 'none')),
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (change_id, horizon_days),
  CHECK (window_before_start < window_before_end),
  CHECK (window_after_start < window_after_end),
  CHECK (window_before_end <= window_after_start)
);

-- UNIQUE index on (change_id, horizon_days) already covers change_id lookups
CREATE INDEX idx_change_checkpoints_computed_at ON change_checkpoints(computed_at);

-- RLS: system-only table (service role bypasses RLS; enabling RLS blocks client access)
ALTER TABLE change_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON change_checkpoints FOR ALL
  USING (auth.role() = 'service_role');
