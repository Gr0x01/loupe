-- Migration: Add LLM assessment columns to change_checkpoints
-- Phase 4: LLM-as-Analyst — replaces deterministic threshold with LLM judgment.

ALTER TABLE change_checkpoints
  ADD COLUMN reasoning text,
  ADD COLUMN data_sources text[] NOT NULL DEFAULT '{}';
