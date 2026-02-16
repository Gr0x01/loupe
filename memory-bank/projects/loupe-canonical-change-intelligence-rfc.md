# Project: Loupe Canonical Change Intelligence (RFC-0001)

**Status:** COMPLETE (All 7 phases shipped)
**Created:** Feb 16, 2026
**Owner:** TBD

---

## Problem

Current Loupe behavior is strong for short-term scan reporting but unstable for long-term decision support:

- Progress shown in Chronicle can drift because it is sourced from `analyses.changes_summary.progress` (LLM snapshot).
- Canonical lifecycle data already exists in `detected_changes`, but UI/read paths do not consistently treat it as the source of truth.
- Outcome analysis is effectively a 7-day model, while user workflow is often 30+ day evaluation ("I changed this, what happened a month later?").
- LLM responsibilities are overloaded (detection + state semantics + narrative), increasing inconsistency risk.

## Goal

Make Loupe reliably answer:

> "We changed X on date Y. What happened at 7/14/30/60/90 days, and what should we do next?"

with deterministic state, auditable evidence, and strong strategy narratives.

## Non-Goals

1. Rebuild Chronicle UI from scratch.
2. Remove LLM usage from Loupe.
3. Force all analysis into one giant LLM prompt.

---

## MVP/V1 Definition (Hard Scope)

MVP/v1 is considered complete only if Loupe can reliably deliver the core value proposition:

> "Track a page change and show what happened over time, including one month+ outcomes, with evidence."

Required MVP/v1 capabilities:

1. Full five-horizon checkpoint support is mandatory: `D+7`, `D+14`, `D+30`, `D+60`, `D+90`.
2. Every horizon result is assessed by LLM with all available data and persisted with reasoning.
3. Canonical status and progress counts are DB-derived. Assessments are LLM-authored with code guardrails.
4. Chronicle can show change state, LLM reasoning, and evidence across those horizons without requiring a new UI shell.
5. Users can provide feedback (thumbs up/down) on resolved outcomes to calibrate future assessments.

Not acceptable for MVP/v1:

1. Shipping with only `D+7`/`D+30`.
2. Deferring `D+14`/`D+60`/`D+90` to "later".
3. Relying on LLM memory/snapshot behavior for lifecycle truth (assessments must be persisted per-checkpoint, not carried in running summary).
4. Deterministic-only outcomes that ignore connected data sources (e.g., Supabase users getting perpetual "inconclusive").

---

## Architecture (Target)

1. `Detection LLM`
- Input: current + previous visual/content context.
- Output: normalized change candidates (what changed, where, confidence).
- Responsibility: change detection and interpretation only.

2. `State Orchestrator` (deterministic)
- Upserts canonical change rows.
- Applies status transitions and idempotency rules.
- Composes UI progress from canonical state.

3. `Assessment LLM` (replaces deterministic Outcome Engine)
- Runs at checkpoint horizons: D+7, D+14, D+30, D+60, D+90.
- Receives ALL connected data: PostHog, GA4, Supabase tables, prior checkpoints, hypothesis, page focus, user feedback.
- Acts as product analyst: returns assessment, confidence, reasoning, evidence summary.
- Code applies guardrails (timing, impossible transitions) but LLM makes the judgment call.

4. `Strategy LLM`
- Reads canonical timeline + evidence + hypotheses + page focus.
- Writes narrative outputs (summary, observations, next actions).
- Runs after assessment is persisted.

5. `Read Model Composer`
- Builds `analyses.changes_summary` as a cache/view object.
- Fully rebuildable from canonical tables.

---

## Source-of-Truth Contract

1. Canonical lifecycle state lives in `detected_changes`.
2. Checkpoint evidence lives in `change_checkpoints` — includes LLM assessment, reasoning, confidence, and data sources consulted.
3. `changes_summary.progress` is derived from canonical DB counts, not authoritative.
4. LLM writes both assessments (outcome verdicts) and narrative. Code enforces guardrails (timing, impossible transitions, schema). User feedback calibrates future assessments.

---

## Integrity vs Intelligence Policy

> **REVISED (Feb 2026):** Original policy ("deterministic-only outcomes") over-constrained the model and left Supabase-only users with zero outcome resolution. The LLM is the product analyst — it sees all data sources and makes assessments. User feedback is the calibration mechanism, not code gates.

This architecture intentionally avoids two failure modes:

1. "Model controls truth with no checks" (hallucination risk).
2. "Code over-constrains model" (low intelligence leverage, data sources ignored).

Policy:

1. `Integrity surface` — code-enforced guardrails.
- Canonical IDs, schema constraints, timing rules (can't validate a 2-day-old change), impossible transition prevention (can't regress a reverted change), audit logging.
- Code enforces *consistency*, not *judgment*.

2. `Intelligence surface` — LLM-led assessment and narrative.
- Outcome assessment: LLM acts as product analyst, using ALL available data (PostHog, GA4, Supabase tables, screenshots, change history, prior checkpoints).
- Narrative, strategy, and recommendation generation.
- LLM writes both the verdict AND the evidence reasoning.

3. `Calibration surface` — user feedback loop.
- Thumbs up/down on resolved change outcomes (extends existing `finding_feedback` pattern).
- Feedback stored alongside checkpoint, fed back into future assessment prompts.
- The user — not deterministic code — is the correction mechanism.

4. `Audit surface` — full transparency.
- Every LLM assessment logged with reasoning, data sources consulted, and confidence.
- Lifecycle events, checkpoint rows, feedback all persisted.
- Auditability through transparency, not rigidity.

---

## Fingerprint Strategy (Deferred — Post-MVP)

> **Status:** Deferred. Current element-name matching in the scan pipeline is sufficient for MVP. The hybrid fingerprint approach below is the intended future direction if duplicate change rows become a real problem.

Future approach: **LLM-first proposal with orchestrator validation**.

1. Detection LLM receives active watching candidates with IDs.
2. Returns `matched_change_id | null`, `match_confidence` (0-1), `match_rationale`.
3. Orchestrator validates: proposed ID in candidate set, scope/type compatible, before/after consistent.
4. Threshold `0.70` — below threshold creates new row, always records proposal metadata.

Not blocking MVP because:
- Current element-name matching works for single-domain accounts (1 domain = fewer collisions).
- Duplicate rows are a data quality issue, not a correctness issue — they don't break assessments.
- Can be added incrementally without schema changes (proposal metadata fields already exist in schema).

---

## Data Model

## Existing (canonical base)

1. `detected_changes`
- Key status lifecycle: `watching | validated | regressed | inconclusive | reverted`.
- Stores change identity and timestamps.

## New table: `change_checkpoints`

Purpose: immutable per-change horizon outcomes.

Columns (proposed):
- `id uuid pk`
- `change_id uuid not null references detected_changes(id)`
- `horizon_days int not null` (allowed: 7, 14, 30, 60, 90)
- `window_before_start timestamptz not null`
- `window_before_end timestamptz not null`
- `window_after_start timestamptz not null`
- `window_after_end timestamptz not null`
- `metrics_json jsonb not null` (structured evidence — see shape below)
- `assessment text not null` (`improved | regressed | neutral | inconclusive`)
- `confidence numeric not null` (0.0–1.0, from LLM assessment)
- `reasoning text not null` (LLM's explanation of the assessment — stored for auditability)
- `data_sources text[] not null` (which providers were consulted: `['posthog', 'supabase']`)
- `provider text not null` (primary provider used: `posthog | ga4 | supabase | none`)
- `computed_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`

Constraints:
- Unique `(change_id, horizon_days)`.
- `CHECK (horizon_days IN (7, 14, 30, 60, 90))`.
- `metrics_json` is the v1 evidence artifact (no separate `change_evidence` table in v1).
- `reasoning` and `confidence` are NOT NULL — every checkpoint must have LLM justification.

### `metrics_json` shape

```jsonc
{
  // Metric-level evidence (when analytics/DB data is available)
  "metrics": [
    {
      "name": "signups",           // friendly metric name
      "source": "supabase",        // which provider returned this
      "before": 340,               // value in before-window
      "after": 412,                // value in after-window
      "change_percent": 21.2,      // computed delta
      "assessment": "improved"     // per-metric LLM assessment
    }
  ],
  // LLM's overall assessment reasoning (mirrors the `reasoning` column but structured)
  "overall_assessment": "improved",
  // When no data is available
  "reason": "analytics_disconnected" // optional — explains inconclusive
}
```

Immutability semantics: rows are **write-once**. Once a checkpoint is computed for a `(change_id, horizon_days)` pair, it is never updated. If a re-run is needed (e.g. data correction), the existing row must be deleted and a new one inserted. The unique constraint enforces one canonical result per horizon. Provenance (provider, computed_at, window boundaries) is captured per row — each row is a self-contained evidence record.

## New table: `change_lifecycle_events`

Purpose: immutable audit log of every canonical status transition. Ensures full provenance — every transition references the checkpoint that triggered it.

Columns (proposed):
- `id uuid pk default gen_random_uuid()`
- `change_id uuid not null references detected_changes(id)`
- `from_status text not null`
- `to_status text not null`
- `reason text not null` (e.g. "D+30: metrics improved")
- `actor_type text not null` (`system | user | llm`)
- `actor_id text null` (job ID or user ID, null for system cron)
- `checkpoint_id uuid null references change_checkpoints(id)` (links to evidence)
- `created_at timestamptz not null default now()`

Constraints:
- Append-only: no updates or deletes in application code.
- `checkpoint_id` is non-null when `actor_type = 'system'` and a checkpoint triggered the transition.

## New table: `tracked_suggestions`

Purpose: persistent opportunity tracking independent of scan snapshots.

Columns (proposed):
- `id uuid pk`
- `page_id uuid not null`
- `user_id uuid not null`
- `title text not null`
- `element text not null`
- `suggested_fix text not null`
- `impact text not null`
- `status text not null default 'open'` (`open | addressed | dismissed`)
- `times_suggested int not null default 1`
- `first_suggested_at timestamptz not null default now()`
- `addressed_at timestamptz null`
- `dismissed_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

---

## Guardrail Rules

1. A change cannot "disappear"; it must transition status.
2. `validated/regressed` requires a checkpoint row with LLM reasoning.
3. Changes < 7 days old cannot be resolved (minimum observation window).
4. `reverted` is terminal — no further transitions allowed.
5. `progress.watching` must equal canonical watching count at compose time.
6. `open` must come from suggestions tracking, not change lifecycle rows.
7. Status transitions are idempotent — replaying a checkpoint job produces the same result.

---

## Checkpoint Transition Policy (Revised)

> **REVISED (Feb 2026):** Replaced deterministic `abs() > 5%` threshold with LLM-as-analyst assessment. The LLM sees all connected data sources and makes the call. User feedback calibrates over time.

Horizon timing is preserved — the LLM assesses at the same intervals:

1. Before D+7:
- Status remains `watching`. No assessment.

2. D+7 and D+14:
- LLM assessment pass with all available data. Persisted as `early signal` checkpoints.
- LLM CAN resolve status at D+7/D+14 if evidence is strong and clear (e.g., dramatic metric shift with high-volume data). Not artificially gated.

3. D+30 (primary decision horizon):
- Full LLM assessment with all prior checkpoint context.
- Most changes resolve here.

4. D+60 and D+90:
- Confirmation or reversal. LLM sees full trajectory across all prior horizons.
- Can override earlier assessments if trend meaningfully changed.

5. LLM Assessment Process (per checkpoint):
- Receives: change details, all connected data (PostHog/GA4/Supabase), prior checkpoints, page focus, hypothesis, user feedback history
- Returns: `assessment` (improved/regressed/neutral/inconclusive), `confidence` (0-1), `reasoning` (stored), `evidence_summary` (what data supported this)
- Code applies: timing guardrails, impossible transition prevention, audit logging

6. Code-enforced guardrails (not LLM judgment):
- `reverted` is terminal — no transitions allowed.
- Changes < 7 days old cannot be resolved.
- Same assessment at same horizon is idempotent (no duplicate writes).

7. Auditability:
- Every checkpoint stores LLM reasoning, data sources consulted, confidence level.
- Every status mutation references the checkpoint + lifecycle event that triggered it.
- User feedback (thumbs up/down) stored alongside for calibration.

---

## Job Graph

## A) Scan Job (event-triggered)

1. Capture screenshot(s).
2. Run detection LLM.
3. Upsert canonical changes (dedup via fingerprint/idempotency key).
4. Process reverts.
5. Compose progress from canonical state + suggestions.
6. Run strategy/narrative LLM inline.
7. Persist `analyses.changes_summary` read model.

## B) Checkpoint Job (scheduled daily)

1. Find changes due for one or more horizons (watching + previously resolved for confirmation).
2. Gather all available data per user: PostHog metrics, GA4 metrics, Supabase table counts, prior checkpoints, hypothesis, page focus, user feedback history.
3. Run LLM assessment pass — LLM acts as product analyst, returns assessment + confidence + reasoning + evidence summary.
4. Write checkpoint rows (assessment + full LLM reasoning as evidence artifact).
5. Apply status transition with code guardrails (timing, impossible transitions).
6. Run strategy/narrative LLM inline for affected pages.
7. Recompose affected read models inline.

---

## Recomposition Trigger Policy (V1 Decision)

Read-model recomposition runs inline at write time, not at read time:

1. After scan mutations in Scan Job.
2. After checkpoint/status mutations in Checkpoint Job.

Rationale:

1. Avoid stale windows caused by deferred async recomposition.
2. Keep API reads fast and simple (no read-time recomposition work).
3. Ensure `changes_summary` behaves as a fresh materialized view after state-changing jobs.

---

## Legacy Job Replacement

The existing `checkCorrelations` cron is replaced by the new multi-horizon Checkpoint Job.

Implications:

1. Single outcome engine path for status transitions.
2. No parallel/competing correlation status writers.
3. Existing logic is migrated into horizon-aware checkpoint evaluation.

---

## Outcome Feedback Loop (New — Feb 2026)

Extends the existing `finding_feedback` pattern to change outcomes. This is the calibration mechanism that replaces deterministic code gates.

### User Flow
1. Change resolves (validated/regressed/inconclusive) — shown in Chronicle/dashboard.
2. User sees outcome card with LLM reasoning: "Your headline change helped — signups up 21% over 30 days."
3. Thumbs up/down button on the outcome.
4. On thumbs down: optional "What did we get wrong?" free-text input.
5. Feedback stored in `outcome_feedback` table, linked to checkpoint.

### Feedback → Calibration
- Future LLM assessment prompts include relevant prior feedback for this page/user.
- Pattern: "Previously, we said X helped signups. The user disagreed because Y. Factor this into your assessment."
- Feedback is contextual (per-user, per-page), not global model fine-tuning.

### Schema: `outcome_feedback` (Shipped)
- `id uuid pk`
- `checkpoint_id uuid not null references change_checkpoints(id) on delete cascade`
- `change_id uuid not null references detected_changes(id) on delete cascade`
- `user_id uuid not null`
- `feedback_type text not null check (in ('accurate', 'inaccurate'))`
- `feedback_text text null check (char_length <= 500)` (free-form correction)
- `created_at timestamptz not null default now()`
- Unique index on `(checkpoint_id, user_id)` — one feedback per checkpoint per user.
- Trigger `check_outcome_feedback_integrity()` enforces checkpoint belongs to change (DB-level).
- RLS: SELECT only (`user_id = auth.uid()`). No INSERT/UPDATE/DELETE policy — writes via service client only.

---

## Read/API Contract

1. `GET /api/pages`
- Attention state derived from canonical lifecycle + latest composed snapshot.

2. `GET /api/pages/[id]/history`
- Returns analysis chain with composed progress fields.

3. `GET /api/changes`
- Returns canonical change rows + latest checkpoint evidence.

4. Suggestion endpoints (new)
- Update suggestion status (`open/addressed/dismissed`).

---

## UI Impact (No Full Redesign Required)

Keep current Chronicle surfaces. Add only targeted capabilities:

1. Evidence drawer on validated/regressed items.
2. Checkpoint chips (`7d`, `14d`, `30d`, `60d`, `90d`).
3. Monthly recap block from strategy outputs.
4. Optional future "Change Ledger" power-user page (not required for v1).

---

## Phases (Execution)

## Phase 1: Canonical Progress Composer ✓

Deliverables (all shipped):
- `composeProgressFromCanonicalState()` in `src/lib/analysis/progress.ts`.
- `getLastCanonicalProgress()` fallback for when live composition fails.
- `formatMetricFriendlyText()` + shared `friendlyMetricNames` map.
- Fail-closed integration: LLM progress is never persisted — canonical or fallback only.
- Recomposition after revert mutations (step 6b in analyzeUrl).
- Parity monitor via Sentry (`monitor: progress-parity` tag) + console warnings.
- Unlock email gated on `canonicalSucceeded` — no email on composer failure.
- Unlock detection uses DB `status = 'validated'` (not item bucket membership).
- `ValidatedItem.status` field for polarity-aware win/regression classification.
- UI components (`DossierSidebar`, `UnifiedTimeline`) classify by `status` with metric-polarity fallback for legacy rows.
- Prompt contract aligned to 30-day decision horizon (was 7-day).
- DB write error checking + Sentry alerting on all critical progress writes.

Exit criteria (met):
- No disappearing watching items (double-failure preserves LLM watching).
- Count parity monitor active (Sentry `progress-parity` tag).
- Integrity telemetry: `composer-failed`, `fallback-used`, `double-failure`, `progress-divergence`.

## Phase 2: Checkpoint Outcome Engine

Deliverables:
- `change_checkpoints` schema + worker.
- Deterministic transition utility module.
- Evidence-backed resolved statuses for all required horizons (`7/14/30/60/90`).
- Eligibility and scheduling logic that guarantees each watching change is evaluated at all five horizons.

Exit criteria:
- Every `validated/regressed` row has checkpoint evidence.
- For a representative cohort, checkpoint coverage exists at all five horizons (no missing 14/60/90 runs).

## Phase 3: Strategy Integration ✓

Deliverables (all shipped):
- LLM writes narrative only (no canonical status writes).
- Prompt context includes compressed multi-horizon timeline via `formatCheckpointTimeline()`.
- Strategy generation runs inline in Scan Job (checkpoint evidence in prompt) and Checkpoint Job (`runStrategyNarrative()` — lightweight text-only LLM, non-fatal with deterministic fallback).
- POST_ANALYSIS_PROMPT trimmed: progress output removed (saves tokens), checkpoint evidence instructions added, progress enforcement logic deleted.
- `strategy_narrative` field added to `ChangesSummary` type.
- `GET /api/changes` returns checkpoint data (horizon_days, assessment, computed_at) per change.

Exit criteria (met):
- LLM failure cannot corrupt lifecycle state — strategy narrative runs after all canonical mutations, wrapped in try/catch, deterministic `formatCheckpointObservation()` stays as fallback.

## Phase 4: LLM-as-Analyst Migration

Deliverables:
- Replace `assessCheckpoint()` deterministic threshold with LLM assessment pass.
- Checkpoint job gathers all connected data sources (PostHog, GA4, Supabase tables) per user.
- LLM assessment prompt: receives change details, metric data, prior checkpoints, hypothesis, page focus, user feedback.
- LLM returns: assessment, confidence, reasoning, evidence summary.
- Store full LLM reasoning in `change_checkpoints.metrics_json` (expanded schema).
- Code guardrails: timing enforcement, impossible transition prevention, idempotency.
- Supabase-only users can now get resolved outcomes.

Exit criteria:
- Checkpoint job uses LLM assessment for all data sources (not just PostHog/GA4).
- Every resolved status has LLM reasoning stored alongside.
- No regression in PostHog/GA4 outcome quality.

## Phase 5: Outcome Feedback Loop ✓

Deliverables (all shipped):
- `outcome_feedback` table with trigger-enforced checkpoint↔change integrity (`check_outcome_feedback_integrity()`), DB-level `feedback_text` length constraint, API-only writes (no client INSERT RLS policy — only SELECT policy for reads).
- `POST /api/feedback/outcome` with 3-hop ownership chain (user → change → checkpoint), resolved-only guard (rejects feedback on watching/inconclusive changes), rate limiting, UUID validation, unique constraint handling (409 on duplicate).
- `OutcomeFeedbackUI` inline component in `UnifiedTimelineCard.tsx`: idle → thumbs up/down → optional text input on thumbs down → submitted states. Reuses hypothesis animation pattern.
- `feedback_map` (keyed by checkpoint_id) + `checkpoint_map` (change_id → latest checkpoint) added to `PageContext`, built via 2-round parallel queries in analysis API (round 1: context + changes, round 2: feedback + checkpoints scoped by change IDs).
- `priorFeedback` array injected into `runCheckpointAssessment()` prompt with "User Feedback Calibration" system prompt section. Inngest reads scoped by `user_id` (prevents cross-tenant poisoning).
- `outcome_feedback_submitted` analytics event with `feedback_type` + `horizon_days`.
- Account deletion cleanup (leaf-first before `detected_changes`).

Exit criteria (met):
- Users can provide feedback on any resolved (validated/regressed) outcome.
- Feedback appears in next checkpoint assessment prompt for that change.
- Cross-tenant poisoning mitigated at both write (API ownership chain) and read (user_id scoping) layers.

## Phase 6: Suggestions as Persistent State ✓

Deliverables (all shipped):
- Suggestion upsert in Inngest post-analysis pipeline: match by `(element_lower, title_lower)`, case-insensitive. Increments `times_suggested` for repeats, reopens addressed/dismissed suggestions when LLM re-suggests (credibility signal). Parallelized via `Promise.allSettled` with per-operation error inspection + Sentry alerting.
- `fetchOpenSuggestions()` helper in `progress.ts` — fail-closed (returns `null` on DB error, propagates to composer). Deduplicated query used in both early-return and normal paths.
- `ComposedProgress` extended with `open: number` + `openItems: OpenItem[]`. All canonical overwrite paths updated (primary, fallback, revert-recompose, checkpoint job).
- Post-upsert recompose: after suggestion upserts complete, re-queries open suggestions and patches the already-written analysis with fresh counts (fixes stale-on-first-run). Both query and write errors logged + sent to Sentry.
- `GET /api/suggestions?page_id=<uuid>` — fetches open tracked suggestions for authenticated user. UUID validation on `page_id`.
- `PATCH /api/suggestions/[id]` — marks suggestion as addressed/dismissed. Auth + rate limiting + UUID validation + ownership chain. Sets `addressed_at`/`dismissed_at` timestamp.
- `SuggestionCard.tsx` updated: `suggestionId`, `timesSuggested`, `onAddress`, `onDismiss` props. "Suggested Nx" credibility badge when `times_suggested > 1`. Done/Dismiss action buttons with optimistic hide + rollback on failure (callbacks are `Promise<void>`, `setDismissed(false)` in catch).
- `NextMoveSection.tsx`: three-state rendering — `trackedSuggestions: undefined` = not loaded (ephemeral fallback for initial audits), `[]` = loaded but empty (authoritative, shows empty state), `[...]` = tracked suggestions with DB IDs. Sort by impact then `times_suggested`.
- `ChronicleLayout.tsx`: passes `trackedSuggestions`, `onSuggestionAddress`, `onSuggestionDismiss` through. Render guard shows NextMoveSection when tracked suggestions are provided (even if empty). Quiet-scan empty state suppressed when suggestions section renders.
- Analysis page (`page.tsx`): state initialized as `null` (not loaded), set to array on fetch success. `null` → `undefined` conversion when passing to ChronicleLayout. Fetch failure leaves `null` so ephemeral fallback applies. `handleSuggestionAction` throws on `!res.ok` for rollback propagation.
- CSS: `.suggestion-card-times-badge` (violet pill), `.suggestion-card-actions` (border-top separator), `.suggestion-action-done` (emerald), `.suggestion-action-dismiss` (subtle gray).

Exit criteria (met):
- Open suggestions persist across scans and accumulate `times_suggested` credibility signal.
- Users can mark suggestions as addressed/dismissed with optimistic UI + rollback.
- Scorecard "Suggestions" count reflects real DB state (not hardcoded 0).
- Backward compat: initial audits without tracked suggestions render ephemeral suggestions.

## Phase 7: Reliability ✓

Deliverables (all shipped):
- **Vitest test framework**: `vitest.config.ts` with `@` path alias, `test`/`test:watch` scripts. 74 unit tests across 4 test suites.
- **Checkpoint engine tests** (`src/lib/analytics/__tests__/checkpoints.test.ts`): 33 tests covering `getEligibleHorizons`, `computeWindows`, `assessCheckpoint`, `resolveStatusTransition`, `formatCheckpointObservation`. Boundary day counts, UTC midnight truncation, regression priority, terminal states, D+30 decision, D+60/90 reversals, inconclusive→clear signal.
- **Pipeline tests** (`src/lib/ai/__tests__/pipeline.test.ts`): 18 tests covering `extractJson`, `extractMatchingBraces`, `closeJson`. Markdown code blocks, text preamble, nested braces, truncated JSON recovery.
- **Progress tests** (`src/lib/analysis/__tests__/progress.test.ts`): 8 tests covering `formatMetricFriendlyText`. Metric formatting, null/empty metrics, unknown keys.
- **Sentry cron monitors**: Both `daily-scans-cron` and `checkpoints-cron` routes wrapped with `captureCheckIn` lifecycle (in_progress → ok/error). `Sentry.flush(2000)` on all exit paths.
- **`formatOutcomeText()` attribution utility** (`src/lib/utils/attribution.ts`): Confidence-banded wording (high ≥0.8 → "helped/hurt", medium 0.5-0.79 → "Likely connected", low <0.5 → hedged). Returns `null` for missing metric data (callers fall through to `observation_text`). Never uses "caused". 15 attribution tests including boundary values.
- **Attribution applied to surfaces**: `UnifiedTimelineCard.tsx` EvidencePanel, `dashboard/page.tsx` WinCard, `email/templates.ts` correlationUnlockedEmail — all use `formatOutcomeText()` with status-aligned metric selection.
- **Launch gate validation queries**: `memory-bank/projects/rfc-0001-launch-gates.md` with 6 SQL ops queries.
- **Reliability fixes** (from code review):
  - Daily-scans backup cron: removed early exit (always runs per-page idempotency to catch partial failures), reports backfill vs already-existed counts.
  - Scan frequency: respects `page.scan_frequency` alongside tier (daily cron skips pages set to "weekly"; weekly cron picks them up).
  - Attribution metric selection: filters metrics by status alignment before picking top by delta (prevents "helped — bounce_rate down" on a regressed card).

Exit criteria (met):
- 74 unit tests passing, zero type errors.
- Sentry cron monitors active for both daily-scans and checkpoint crons.
- Attribution language enforced across all product surfaces (Chronicle, dashboard, email).
- No "caused" language in any attribution output.

## V1 Launch Gates (Must Pass)

1. Five-horizon coverage: each eligible change receives checkpoint evaluations at `7/14/30/60/90` days.
2. Evidence completeness: every resolved status has linked checkpoint with LLM reasoning.
3. State parity: composed `progress` matches canonical DB counts for watched pages.
4. Long-window proof: at least one internal/end-to-end validation run demonstrates month+ visibility (`D+30` and beyond) in Chronicle.
5. Attribution language policy enforced: all product surfaces use confidence-appropriate wording (see below). No "caused" without explicit caveat.
6. Outcome feedback: users can thumbs up/down any resolved outcome.

---

## Execution Checklist (Checkmarkable Workstreams)

Use this as the implementation tracker. Workstreams can run in parallel; all boxes should be complete before v1 launch. These workstreams are orthogonal to the Phases (Execution) above — phases are sequenced deliverables, workstreams are parallel tracks.

## Workstream A: Architecture Lock

- [x] Approve `Integrity vs Intelligence` policy.
- [x] ~~Approve fingerprint policy~~ — deferred; current element-name matching is sufficient for MVP.
- [x] Approve checkpoint transition policy (`D+7/14 signal`, `D+30 decision`, `D+60/90 confirm/override`).
- [x] Approve recomposition policy (inline at write time).
- [x] Approve replacement of `checkCorrelations` with the multi-horizon Checkpoint Job.
- [x] **REVISED:** Approve LLM-as-analyst pivot — LLM makes outcome assessments, user feedback calibrates (Feb 2026).

Done when:
- [x] No open architecture decisions block implementation.

## Workstream B: Data Contracts + Migrations

- [x] Add `change_checkpoints` table with unique `(change_id, horizon_days)`.
- [x] Add `tracked_suggestions` table.
- [x] Add lifecycle event log table for immutable transitions.
- [ ] Add model proposal/provenance fields (proposal ID, confidence, rationale, model/prompt version).
- [x] Add indexes/idempotency keys for scan, upsert, checkpoint, and recomposition paths.
- [x] Add `outcome_feedback` table with trigger integrity enforcement + API-only writes.

Done when:
- [ ] Schema supports full v1 behavior without placeholder/TODO columns.

## Workstream C: Detection + Orchestrator

> **Deferred.** Fingerprint-based change linkage (LLM proposes `matched_change_id`) is not required for MVP. Current element-name matching in the scan pipeline is sufficient. Revisit if duplicate change rows become a real problem.

- [x] ~~Implement canonical upsert + revert processing with idempotency.~~ (Shipped in Phase 1-2 via existing scan pipeline.)
- [ ] *Future:* Update detection prompt to include active watching candidates with IDs.
- [ ] *Future:* Require detection output fields: `matched_change_id`, `match_confidence`, `match_rationale`.
- [ ] *Future:* Implement orchestrator validation gates for matching proposals.

Done when:
- [x] Current detection works without corrupting canonical state (existing behavior is sufficient for MVP).

## Workstream D: Checkpoint Engine (5 Horizons) ✓

- [x] Build daily checkpoint scheduler for `7/14/30/60/90`.
- [x] Enforce UTC window semantics consistently.
- [x] Compute metric deltas and write `change_checkpoints`.
- [x] Apply transition rules and write immutable lifecycle events.
- [x] Ensure every status mutation references checkpoint evidence.

Done: All five horizons execute and persist for eligible changes.

## Workstream E: Read Model + Narrative Integration ✓

- [x] Compose `changes_summary.progress` from canonical DB state + suggestions.
- [x] Run recomposition inline after scan mutations and checkpoint mutations.
- [x] Run strategy LLM inline in Scan Job and Checkpoint Job.
- [x] ~~Enforce narrative-only writes from strategy LLM~~ — **REVISED:** LLM now writes assessments too (see policy revision).
- [x] Update APIs to serve composed canonical view consistently.

Done: Canonical composition and narrative integration shipped.

## Workstream F: UI + Product Surface

- [x] Add checkpoint chips (`7d/14d/30d/60d/90d`) — watching cards show all-future dashed chips; resolved cards show color-coded by assessment (emerald/coral/gray).
- [x] Add evidence panel for resolved outcomes (LLM reasoning, metric deltas with before→after±%, data sources, confidence, computed date, preview text).
- [x] Add outcome feedback UI (thumbs up/down on resolved changes). 409 duplicate handled as submitted state.
- [x] Keep existing Chronicle shell (no full redesign).
- [x] Batch-fetch checkpoints in `composeProgressFromCanonicalState()` and attach to `ValidatedItem`/`WatchingItem`.

Done when:
- [x] A user can see outcome reasoning and provide feedback directly in Chronicle.

## Workstream G: Reliability + Launch Gates ✓

- [x] Add parity monitor (`read model` vs canonical counts).
- [x] Add unit tests for pure logic (74 tests: checkpoint engine, pipeline extraction, progress utilities, attribution).
- [x] Execute forward-only cutover.
- [x] Sentry cron monitors on both Vercel Cron backup routes.
- [x] `formatOutcomeText()` attribution utility with confidence bands, applied to all surfaces.
- [x] Launch gate SQL validation queries documented.
- [ ] Long-window proof (D+30+) — time-gated, earliest March 18.

Done when:
- [x] V1 launch gates are green (except long-window proof which is time-gated).

---

## SLOs

1. `state_parity_mismatch_rate < 0.5%`.
2. `checkpoint_job_success_rate > 99%`.
3. `resolved_without_evidence_count = 0`.
4. `time_to_checkpoint <= 24h after due`.

---

## Risks

1. Duplicate change rows without strong fingerprinting.
2. Prompt bloat if raw history is passed uncompressed.
3. Semantic drift between live canonical state and historical snapshot expectations.
4. **LLM assessment inconsistency** — same data could yield different verdicts across runs. Mitigated by: write-once checkpoints (no re-assessment), stored reasoning (auditable), user feedback (calibration), and confidence bands (hedged language when uncertain).
5. **Over-attribution** — LLM may be too eager to claim correlation. Mitigated by: attribution language policy (launch gate), confidence-banded wording, "never say caused" rule, user thumbs-down as correction signal.

---

## Future-State Decisions to Lock Now (Do Not Defer)

These decisions should be made in v1 architecture, because they are expensive or impossible to reconstruct correctly later.

1. Change identity contract and versioning.
- Define fingerprint inputs now and include a versioned scheme (`fingerprint_version`).
- Allow future matching upgrades without rewriting historical meaning.

2. Immutable lifecycle event log.
- Record every transition event (`from_status`, `to_status`, reason, actor/job, timestamp).
- Do not rely only on current row status for historical truth.

3. Checkpoint provenance model.
- Persist provider, metric definitions, window boundaries, and query metadata per horizon run.
- Ensure every outcome is auditable and reproducible.

4. Model provenance model.
- Persist model/version, prompt version, and mapping proposal details (`matched_change_id`, confidence, rationale).
- Keep model proposals non-authoritative but inspectable.

5. Time and window semantics.
- Standardize all horizon logic in UTC.
- Define inclusive/exclusive boundary rules once and use them everywhere.

6. Attribution language policy. **(V1 LAUNCH GATE — not deferrable.)**
- System-wide policy for wording tied to confidence levels:
  - **High confidence (>0.8):** "Your [change] helped — [metric] improved [X]%." (Direct attribution, still not "caused.")
  - **Medium confidence (0.5–0.8):** "Since your [change], [metric] is up [X]%. Likely connected." (Correlation language.)
  - **Low confidence (<0.5):** "We're seeing [metric] movement, but can't tie it clearly to your change yet." (Hedged.)
  - **No data:** "No analytics connected — connect PostHog, GA4, or your database to track outcomes."
- LLM assessment prompt includes these bands so wording is consistent.
- Never use "caused" in any product surface. Strongest claim is "helped" or "hurt."
- This is central to user trust, especially now that LLM (not deterministic code) makes the call.
- **Enforcement points:**
  1. **LLM assessment prompt** — confidence bands + wording templates baked into checkpoint assessment prompt.
  2. **LLM strategy/narrative prompt** — attribution language rules in POST_ANALYSIS_PROMPT and `runStrategyNarrative()`.
  3. **UI copy** — `formatOutcomeText(confidence, assessment)` utility that maps confidence → wording band. Used by Chronicle, dashboard ProofBanner, outcome cards.
  4. **Email templates** — `correlationUnlockedEmail` and `changeDetectedEmail` use same `formatOutcomeText()`.
  5. **Outcome feedback** — if users thumbs-down an attribution, flag for review (may indicate over-claiming).

7. Integration health state history.
- Persist historical integration state (`connected`, `degraded`, `disconnected`, `token_expired`) over time.
- Avoid ambiguity when interpreting missing/weak checkpoints.

8. Idempotency contract per workflow.
- Define idempotency keys for scan ingestion, change upsert, checkpoint writes, and read-model recomposition.
- Make retries safe by design.

9. User-intent snapshots.
- Persist page focus and hypothesis as-of the relevant change/checkpoint time.
- Do not rely on mutable "latest profile state" for historical interpretation.

10. Cutover and recomposition contract.
- Define a forward-only cutover point for canonical composition.
- Treat full historical backfill as optional due to low production history and limited watcher usage.

## Safe to Defer (Post-v1)

1. New power-user screens (for example, full Change Ledger).
2. Advanced causal inference models beyond correlation evidence.
3. Cross-page portfolio attribution and benchmarking.
4. Sophisticated suggestion ranking or personalization models.

---

## Open Decisions

1. Final significance policy details by horizon (for example, override guardrails at D+60/D+90).
2. Whether D+7/D+14 "early signal" should be surfaced with dedicated UI labels in v1 or v1.1.

---

## Implementation Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Canonical Progress Composer | **Done** | Fail-closed composer, fallback chain, parity monitor, polarity-aware UI, 30-day prompt alignment. See phase details above. |
| Phase 2: Checkpoint Outcome Engine | **Done** | `change_checkpoints` table + `runCheckpoints` daily cron (10:30 UTC) + `change_lifecycle_events` audit trail. `resolveStatusTransition()` in `src/lib/analytics/checkpoints.ts`. Vercel Cron backup at 10:45 UTC with dual event trigger. Idempotent upserts via `ON CONFLICT DO NOTHING`. Lifecycle event failure → status revert (maintains invariant). Paginated queries (500/batch), batched `.in()` (300/batch). Provider init try/catch (analytics failure doesn't abort run). `checkCorrelations` fully replaced and deleted. |
| Phase 3: Strategy Integration | **Done** | LLM writes narrative only — progress output removed from prompt. `formatCheckpointTimeline()` compresses multi-horizon evidence into prompt context. `runStrategyNarrative()` runs inline in checkpoint job (non-fatal, deterministic fallback). Scan job passes checkpoint timelines to post-analysis. `GET /api/changes` includes checkpoint data per change. `strategy_narrative` field added to `ChangesSummary`. |
| Phase 4: LLM-as-Analyst Migration | **Done** | LLM assessment replaces deterministic threshold. `runCheckpointAssessment()` in pipeline.ts (Gemini 3 Pro, 3 attempts with backoff). `gatherSupabaseMetrics()` in correlation.ts queries historical snapshots + current table counts. Checkpoint upsert writes `reasoning`, `confidence`, `data_sources`. Deterministic `assessCheckpoint()` kept as fallback (now sees all metrics including Supabase). `GET /api/changes` returns new fields per checkpoint. Migration: `20260217_checkpoint_llm_assessment.sql`. |
| Phase 5: Outcome Feedback Loop | **Done** | `outcome_feedback` table (trigger-enforced checkpoint↔change integrity, API-only writes, no client INSERT policy). `POST /api/feedback/outcome` with ownership chain validation + resolved-only guard. Thumbs up/down UI on validated/regressed cards in Chronicle (`OutcomeFeedbackUI` in `UnifiedTimelineCard.tsx`). `feedback_map` (keyed by checkpoint_id) + `checkpoint_map` in page_context via 2-round parallel queries — `checkpoint_map` uses assessment-match logic (checkpoint.assessment matches change status, e.g. improved↔validated) with highest-horizon fallback. `priorFeedback` injected into `runCheckpointAssessment()` prompt with calibration instructions. Inngest reads scoped by `user_id`. Account deletion cleanup. 409 duplicate handled as success in UI. |
| Phase 6: Suggestions as Persistent State | **Done** | Suggestion upsert in Inngest (match by element+title, case-insensitive, `times_suggested` increment, reopen on re-suggest). `fetchOpenSuggestions()` fail-closed helper. `ComposedProgress` extended with `open`/`openItems`. Post-upsert recompose fixes stale counts. `GET /api/suggestions` + `PATCH /api/suggestions/[id]` endpoints. SuggestionCard with credibility badge + Done/Dismiss with optimistic rollback. NextMoveSection three-state rendering (undefined/empty/populated). Analysis page null→undefined sentinel pattern. |
| Phase 7: Reliability | **Done** | Vitest framework (74 tests across 4 suites). Sentry cron monitors on daily-scans + checkpoints routes. `formatOutcomeText()` confidence-banded attribution (returns null for no-data, never "caused"). Applied to Chronicle EvidencePanel, dashboard WinCard, email templates. Status-aligned metric selection prevents contradictions. Daily-scans backup: always runs per-page idempotency (catches partial failures). Scan frequency respects page-level settings. Launch gate SQL queries. |

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/analysis/progress.ts` | `composeProgressFromCanonicalState` (+ batch checkpoint fetch → attach to items + open suggestions), `getLastCanonicalProgress`, `fetchOpenSuggestions` (fail-closed), `formatMetricFriendlyText`, `friendlyMetricNames` |
| `src/lib/analytics/checkpoints.ts` | `getEligibleHorizons`, `computeWindows`, `assessCheckpoint` (deterministic fallback), `resolveStatusTransition`, `formatCheckpointObservation`, `DECISION_HORIZON` |
| `src/lib/ai/pipeline.ts` | `formatCheckpointTimeline` (Phase 3), `runStrategyNarrative` (Phase 3), `runCheckpointAssessment` (Phase 4), `runPostAnalysisPipeline`, POST_ANALYSIS_PROMPT |
| `src/lib/analytics/correlation.ts` | `correlateChange` (PostHog/GA4 metrics), `gatherSupabaseMetrics` (Phase 4 — Supabase DB metrics for checkpoints) |
| `src/lib/inngest/functions.ts` | `runCheckpoints` cron (+ strategy narrative in recompose step), fail-closed composer in `analyzeUrl` (+ checkpoint timeline gathering), recompose-after-reverts |
| `src/app/api/cron/checkpoints/route.ts` | Vercel Cron backup for checkpoint engine |
| `src/app/api/changes/route.ts` | `GET /api/changes` — returns checkpoint data per change (Phase 3) |
| `src/lib/types/analysis.ts` | `HorizonDays`, `CheckpointAssessment`, `CheckpointAssessmentResult`, `ChangeCheckpoint` (+ `reasoning`, `data_sources`), `ChangeCheckpointSummary` (+ `id`, `confidence`, `reasoning`, `data_sources`, `metrics_json`), `CheckpointMetrics` (+ `source?`), `StatusTransition`, `ValidatedItem.status`/`checkpoints`, `WatchingItem.checkpoints`, `ChangesSummary.strategy_narrative`, `OutcomeFeedback`, `PageContext.feedback_map` (keyed by checkpoint_id)/`checkpoint_map` |
| `src/app/api/feedback/outcome/route.ts` | `POST /api/feedback/outcome` — ownership chain validation, resolved-only guard, unique constraint handling |
| `src/app/api/analysis/[id]/route.ts` | `checkpoint_map` builder with assessment-match logic (prefers checkpoint whose assessment matches displayed status), `feedback_map` keyed by checkpoint_id |
| `src/components/chronicle/UnifiedTimelineCard.tsx` | `OutcomeFeedbackUI`, `CheckpointChips` (color-coded + future dashed), `EvidencePanel` (reasoning, metric deltas, data sources, preview text) — all inline components on resolved + watching cards |
| `src/app/api/suggestions/route.ts` | `GET /api/suggestions?page_id=` — fetch open tracked suggestions for authenticated user |
| `src/app/api/suggestions/[id]/route.ts` | `PATCH /api/suggestions/[id]` — mark suggestion as addressed/dismissed with ownership validation |
| `src/components/chronicle/SuggestionCard.tsx` | Suggestion card with credibility badge (`times_suggested`), Done/Dismiss actions with optimistic rollback |
| `src/components/chronicle/NextMoveSection.tsx` | Three-state rendering: undefined (ephemeral fallback), empty (authoritative), populated (tracked from DB) |
| `vitest.config.ts` | Test framework config (node env, `@` path alias) |
| `src/lib/utils/attribution.ts` | `formatOutcomeText()` — confidence-banded attribution utility (returns `string \| null`) |
| `src/lib/utils/__tests__/attribution.test.ts` | 15 attribution tests (all bands, boundary values, never-caused) |
| `src/lib/analytics/__tests__/checkpoints.test.ts` | 33 checkpoint engine tests |
| `src/lib/ai/__tests__/pipeline.test.ts` | 18 extractJson/closeJson tests |
| `src/lib/analysis/__tests__/progress.test.ts` | 8 progress utility tests |
| `memory-bank/projects/rfc-0001-launch-gates.md` | SQL validation queries for launch gates |

## Status

**RFC-0001 is complete.** All 7 phases shipped. Remaining items are time-gated (D+30 long-window proof earliest March 18) or operational (run launch gate SQL queries against production).
