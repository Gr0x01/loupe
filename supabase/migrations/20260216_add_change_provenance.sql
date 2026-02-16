-- Migration: Add provenance fields to detected_changes
-- Fingerprint matching fields for change identity linking (unused until Phase 3).
-- Part of Canonical Change Intelligence (RFC-0001, Phase 2).

ALTER TABLE detected_changes
  ADD COLUMN matched_change_id uuid REFERENCES detected_changes(id) ON DELETE SET NULL,
  ADD COLUMN match_confidence numeric(3,2) CHECK (match_confidence >= 0 AND match_confidence <= 1),
  ADD COLUMN match_rationale text,
  ADD COLUMN fingerprint_version int NOT NULL DEFAULT 1;

CREATE INDEX idx_detected_changes_matched ON detected_changes(matched_change_id) WHERE matched_change_id IS NOT NULL;
