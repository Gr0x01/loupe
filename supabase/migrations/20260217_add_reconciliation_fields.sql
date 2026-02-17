-- Add reconciliation fields: superseded status, superseded_by FK, magnitude column
-- Supports change magnitude classification (incremental vs overhaul)

-- Add 'superseded' to the detected_changes status check constraint
ALTER TABLE detected_changes DROP CONSTRAINT IF EXISTS detected_changes_status_check;
ALTER TABLE detected_changes ADD CONSTRAINT detected_changes_status_check
  CHECK (status IN ('watching', 'validated', 'regressed', 'inconclusive', 'reverted', 'superseded'));

-- Add superseded_by column (nullable FK to self — tracks which aggregate absorbed this record)
ALTER TABLE detected_changes ADD COLUMN IF NOT EXISTS superseded_by uuid REFERENCES detected_changes(id);

-- Add magnitude column (nullable: incremental or overhaul)
ALTER TABLE detected_changes ADD COLUMN IF NOT EXISTS magnitude text CHECK (magnitude IN ('incremental', 'overhaul'));

-- Index for efficient lookup of superseded records by their parent
CREATE INDEX IF NOT EXISTS idx_detected_changes_superseded_by ON detected_changes(superseded_by) WHERE superseded_by IS NOT NULL;

-- Also allow 'superseded' in the change_lifecycle_events status columns
ALTER TABLE change_lifecycle_events DROP CONSTRAINT IF EXISTS change_lifecycle_events_from_status_check;
ALTER TABLE change_lifecycle_events DROP CONSTRAINT IF EXISTS change_lifecycle_events_to_status_check;
ALTER TABLE change_lifecycle_events ADD CONSTRAINT change_lifecycle_events_from_status_check
  CHECK (from_status IN ('watching', 'validated', 'regressed', 'inconclusive', 'reverted', 'superseded'));
ALTER TABLE change_lifecycle_events ADD CONSTRAINT change_lifecycle_events_to_status_check
  CHECK (to_status IN ('watching', 'validated', 'regressed', 'inconclusive', 'reverted', 'superseded'));
