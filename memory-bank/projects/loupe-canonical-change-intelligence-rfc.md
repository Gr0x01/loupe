# Project: Loupe Canonical Change Intelligence (RFC-0001)

**Status:** DRAFT (proposed)
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
2. Every horizon result is computed deterministically from analytics data and persisted.
3. Canonical status and progress are DB-derived, never LLM-authored.
4. Chronicle can show change state and evidence across those horizons without requiring a new UI shell.

Not acceptable for MVP/v1:

1. Shipping with only `D+7`/`D+30`.
2. Deferring `D+14`/`D+60`/`D+90` to "later".
3. Relying on LLM memory/snapshot behavior for lifecycle truth.

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

3. `Outcome Engine` (deterministic)
- Runs checkpoint evaluations at D+7, D+14, D+30, D+60, D+90.
- Computes metrics and writes evidence snapshots.
- Updates canonical status (`validated`, `regressed`, `inconclusive`).

4. `Strategy LLM`
- Reads canonical timeline + evidence + hypotheses + page focus.
- Writes narrative outputs only (summary, observations, next actions).
- Cannot write canonical status/counts.

5. `Read Model Composer`
- Builds `analyses.changes_summary` as a cache/view object.
- Fully rebuildable from canonical tables.

---

## Source-of-Truth Contract

1. Canonical lifecycle state lives in `detected_changes`.
2. Checkpoint evidence lives in `change_checkpoints` (v1 canonical evidence store).
3. `changes_summary.progress` is derived, not authoritative.
4. LLM output is advisory narrative unless explicitly mapped by deterministic code.

---

## Integrity vs Intelligence Policy

This architecture intentionally avoids two failure modes:

1. "Model controls truth" (high drift risk over time).
2. "Code over-constrains model" (low intelligence leverage).

Policy:

1. `Integrity surface` is deterministic only.
- Canonical IDs, lifecycle status transitions, progress counts, evidence links, and notification triggers.
- Model output can propose, but cannot directly mutate canonical truth.

2. `Intelligence surface` is model-led.
- Semantic change interpretation, linkage proposals, narrative, strategy, and recommendation generation.
- Model creativity and pattern recognition are expected here.

3. `Bridge pattern`: model proposes -> orchestrator validates.
- The model is used as a strong proposer.
- Deterministic code is the final authority for state mutation.

---

## Fingerprint Strategy (V1 Decision)

V1 chooses a hybrid approach: **LLM-first proposal with deterministic validation**.

Flow:

1. Build deterministic candidate set from DB.
- Candidates: active page-local watching rows filtered by compatible `scope` and `element_type` when present.

2. Detection LLM proposes mapping.
- For each detected change, return `matched_change_id | null`, `confidence`, and brief rationale.

3. Orchestrator validates hard constraints.
- Proposed ID must belong to candidate set.
- Scope/type compatibility must hold.
- Basic before/after consistency checks must pass.

4. Resolve:
- Valid + confidence above threshold -> link to existing row.
- Invalid or low confidence -> create new canonical row.

5. Always record proposal metadata.
- Store proposed link + confidence + rationale for audits and future tuning.
- Metadata is non-authoritative.

6. Confidence threshold for v1 linkage acceptance.
- Default threshold: `0.70`.
- If proposal confidence < `0.70`, create a new canonical row and record proposal metadata.

Why this is the V1 choice:

1. Avoids brittle string-only matching (`element` rename issue).
2. Avoids model-only identity assignment risk.
3. Preserves model intelligence while protecting long-term state integrity.

---

## Detection Prompt Contract (Linkage Inputs/Outputs)

To support `matched_change_id` proposals, the detection LLM must receive active candidate IDs in prompt context.

Required prompt section (shape example):

```text
## Active Watching Changes (for linkage)
- id: "abc-123", element: "Headline", element_type: "headline", scope: "element", after: "Get started today"
- id: "def-456", element: "Trust Signals", element_type: "section_copy", scope: "section", after: "Built for founders..."
```

Required per-change model output fields:

1. `matched_change_id: string | null`
2. `match_confidence: number` (0.0-1.0)
3. `match_rationale: string` (short explanation)

The orchestrator validates this output before any canonical write.

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
- `metrics_json jsonb not null` (metric values and deltas)
- `assessment text not null` (`improved | regressed | neutral | inconclusive`)
- `confidence numeric null`
- `provider text not null` (`posthog | ga4 | ...`)
- `computed_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`

Constraints:
- Unique `(change_id, horizon_days)`.
- `CHECK (horizon_days IN (7, 14, 30, 60, 90))`.
- `metrics_json` is the v1 evidence artifact (no separate `change_evidence` table in v1).

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

## Deterministic Rules

1. Status transitions are code-defined and idempotent.
2. A change cannot "disappear"; it must transition status.
3. `validated/regressed` requires checkpoint evidence.
4. `progress.watching` must equal canonical watching count at compose time.
5. `open` must come from suggestions tracking, not change lifecycle rows.

---

## Checkpoint Transition Policy (V1 Decision)

V1 uses a decision-horizon model:

1. Before D+7:
- Status remains `watching`.

2. D+7 and D+14:
- Compute and persist checkpoints as `early signal` evidence.
- Do not set final canonical status from these horizons.

3. D+30 (decision horizon):
- First canonical resolution point.
- Set `detected_changes.status` to `validated | regressed | inconclusive` using deterministic threshold rules.

4. D+60 and D+90:
- Treated as confirmation/reversal checkpoints.
- May override canonical status if trend meaningfully reverses by deterministic policy.

5. Assessment → Status mapping (deterministic):

| Assessment | Current Status | New Status | Notes |
|------------|---------------|------------|-------|
| `improved` | `watching` | `validated` | D+30 decision horizon |
| `regressed` | `watching` | `regressed` | D+30 decision horizon |
| `neutral` | `watching` | `inconclusive` | D+30 decision horizon |
| `inconclusive` | `watching` | `inconclusive` | D+30 decision horizon |
| `improved` | `regressed` | `validated` | D+60/90 trend reversal |
| `regressed` | `validated` | `regressed` | D+60/90 trend reversal |
| `improved`/`regressed` | `inconclusive` | `validated`/`regressed` | D+60/90 clear signal emerged |
| `neutral`/`inconclusive` | any resolved | no change | D+60/90 — only reverse on clear signal |
| any | `reverted` | no change | Terminal status |

This mapping is implemented in `resolveStatusTransition()` (`src/lib/analytics/checkpoints.ts`).

6. Threshold baseline:
- Initial significance threshold is `abs(change_percent) > 5%` (subject to tuning).

7. Auditability:
- Every status mutation must reference the checkpoint row that triggered it.

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

1. Find `watching` changes due for one or more horizons.
2. Query analytics deterministically.
3. Write checkpoint rows (v1 evidence artifact).
4. Apply lifecycle transition logic.
5. Run strategy/narrative LLM inline for affected pages.
6. Recompose affected read models inline.

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

## Phase 3: Strategy Integration

Deliverables:
- LLM writes narrative only (no canonical status writes).
- Prompt context includes compressed multi-horizon timeline.
- Strategy generation runs inline in Scan Job and Checkpoint Job (no separate strategy cron).

Exit criteria:
- LLM failure cannot corrupt lifecycle state.

## Phase 4: Suggestions as Persistent State

Deliverables:
- `tracked_suggestions` table + status endpoints.
- Composer integrates suggestion-derived `open` counts.

Exit criteria:
- Open suggestions persist and can be addressed/dismissed.

## Phase 5: Reliability and Backfill

Deliverables:
- Optional one-time recomposition script for historical progress (if needed).
- Replay and idempotency tests.
- Monitoring/alerting for drift and job failures.

Exit criteria:
- Stable behavior over 3-12 month histories.

## V1 Launch Gates (Must Pass)

1. Five-horizon coverage: each eligible change receives checkpoint evaluations at `7/14/30/60/90` days.
2. Evidence completeness: every resolved status has linked checkpoint evidence.
3. State parity: composed `progress` matches canonical DB counts for watched pages.
4. Long-window proof: at least one internal/end-to-end validation run demonstrates month+ visibility (`D+30` and beyond) in Chronicle.

---

## Execution Checklist (Checkmarkable Workstreams)

Use this as the implementation tracker. Workstreams can run in parallel; all boxes should be complete before v1 launch. These workstreams are orthogonal to the Phases (Execution) above — phases are sequenced deliverables, workstreams are parallel tracks.

## Workstream A: Architecture Lock

- [ ] Approve `Integrity vs Intelligence` policy.
- [ ] Approve fingerprint policy (`LLM proposes`, orchestrator validates, threshold `0.70`).
- [ ] Approve checkpoint transition policy (`D+7/14 signal`, `D+30 decision`, `D+60/90 confirm/override`).
- [ ] Approve recomposition policy (inline at write time).
- [ ] Approve replacement of `checkCorrelations` with the multi-horizon Checkpoint Job.

Done when:
- [ ] No open architecture decisions block implementation.

## Workstream B: Data Contracts + Migrations

- [ ] Add `change_checkpoints` table with unique `(change_id, horizon_days)`.
- [ ] Add `tracked_suggestions` table.
- [ ] Add lifecycle event log table for immutable transitions.
- [ ] Add model proposal/provenance fields (proposal ID, confidence, rationale, model/prompt version).
- [ ] Add indexes/idempotency keys for scan, upsert, checkpoint, and recomposition paths.

Done when:
- [ ] Schema supports full v1 behavior without placeholder/TODO columns.

## Workstream C: Detection + Orchestrator

- [ ] Update detection prompt to include active watching candidates with IDs.
- [ ] Require detection output fields: `matched_change_id`, `match_confidence`, `match_rationale`.
- [ ] Implement orchestrator validation gates for matching proposals.
- [ ] Implement canonical upsert + revert processing with idempotency.
- [ ] Record proposal metadata even when proposal is rejected.

Done when:
- [ ] Detection can link changes reliably without corrupting canonical state.

## Workstream D: Checkpoint Engine (5 Horizons)

- [ ] Build daily checkpoint scheduler for `7/14/30/60/90`.
- [ ] Enforce UTC window semantics consistently.
- [ ] Compute deterministic metric deltas and write `change_checkpoints`.
- [ ] Apply transition rules and write immutable lifecycle events.
- [ ] Ensure every status mutation references checkpoint evidence.

Done when:
- [ ] All five horizons execute and persist for eligible changes.

## Workstream E: Read Model + Narrative Integration

- [ ] Compose `changes_summary.progress` from canonical DB state + suggestions.
- [ ] Run recomposition inline after scan mutations and checkpoint mutations.
- [ ] Run strategy LLM inline in Scan Job and Checkpoint Job.
- [ ] Enforce narrative-only writes from strategy LLM (no canonical status writes).
- [ ] Update APIs to serve composed canonical view consistently.

Done when:
- [ ] UI counts and statuses match canonical DB state after each mutation path.

## Workstream F: UI + Product Surface

- [ ] Add checkpoint chips (`7d/14d/30d/60d/90d`).
- [ ] Add evidence panel for resolved outcomes.
- [ ] Surface early-signal (`D+7/14`) vs decision-horizon (`D+30`) context.
- [ ] Keep existing Chronicle shell (no full redesign).

Done when:
- [ ] A user can answer "what changed and what happened over time?" directly in Chronicle.

## Workstream G: Reliability + Launch Gates

- [ ] Add parity monitor (`read model` vs canonical counts).
- [ ] Add replay and idempotency tests for core mutation paths.
- [ ] Add SLO dashboards and alerts.
- [ ] Execute forward-only cutover.
- [ ] Validate all v1 launch gates.

Done when:
- [ ] V1 launch gates are green and stable.

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

6. Attribution language policy.
- System-wide policy for wording (`correlated` vs `caused`) tied to confidence levels.
- Prevent over-claiming causality in product surfaces.

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
| Phase 2: Checkpoint Outcome Engine | **Done** | `change_checkpoints` table + `runCheckpoints` daily cron + `change_lifecycle_events` audit trail. `resolveStatusTransition()` in `src/lib/analytics/checkpoints.ts`. Vercel Cron backup with event trigger. Idempotent upserts. |
| Phase 3: Strategy Integration | Not started | |
| Phase 4: Suggestions as Persistent State | Not started | `tracked_suggestions` migration exists but no endpoints/integration yet. |
| Phase 5: Reliability and Backfill | Not started | |

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/analysis/progress.ts` | `composeProgressFromCanonicalState`, `getLastCanonicalProgress`, `formatMetricFriendlyText`, `friendlyMetricNames` |
| `src/lib/analytics/checkpoints.ts` | `getEligibleHorizons`, `computeWindows`, `assessCheckpoint`, `resolveStatusTransition`, `formatCheckpointObservation`, `DECISION_HORIZON` |
| `src/lib/inngest/functions.ts` | `runCheckpoints` cron, fail-closed composer integration in `analyzeUrl`, recompose-after-reverts |
| `src/app/api/cron/checkpoints/route.ts` | Vercel Cron backup for checkpoint engine |
| `src/lib/types/analysis.ts` | `HorizonDays`, `CheckpointAssessment`, `ChangeCheckpoint`, `StatusTransition`, `ValidatedItem.status` |

## Immediate Next Steps

1. Begin Phase 3: Strategy Integration (narrative-only LLM with multi-horizon context).
2. Build suggestion endpoints for Phase 4.
3. Add integration/unit tests for integrity paths (deferred from Phase 1).
