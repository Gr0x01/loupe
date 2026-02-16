# RFC-0001 Launch Gate Validation Queries

Run these against prod Supabase to verify system health before declaring Phase 7 complete.

## 1. Five-Horizon Coverage

Changes ≥90 days old should have all 5 checkpoints (7, 14, 30, 60, 90). Younger changes get fewer.

```sql
-- Changes with fewer checkpoints than expected
SELECT
  dc.id,
  dc.element,
  dc.status,
  dc.first_detected_at,
  EXTRACT(DAY FROM NOW() - dc.first_detected_at) AS age_days,
  COUNT(cp.id) AS checkpoint_count,
  ARRAY_AGG(cp.horizon_days ORDER BY cp.horizon_days) AS horizons
FROM detected_changes dc
LEFT JOIN change_checkpoints cp ON cp.change_id = dc.id
WHERE dc.status IN ('watching', 'validated', 'regressed', 'inconclusive')
  AND dc.first_detected_at < NOW() - INTERVAL '7 days'
GROUP BY dc.id, dc.element, dc.status, dc.first_detected_at
HAVING (
  (EXTRACT(DAY FROM NOW() - dc.first_detected_at) >= 90 AND COUNT(cp.id) < 5) OR
  (EXTRACT(DAY FROM NOW() - dc.first_detected_at) >= 60 AND EXTRACT(DAY FROM NOW() - dc.first_detected_at) < 90 AND COUNT(cp.id) < 4) OR
  (EXTRACT(DAY FROM NOW() - dc.first_detected_at) >= 30 AND EXTRACT(DAY FROM NOW() - dc.first_detected_at) < 60 AND COUNT(cp.id) < 3) OR
  (EXTRACT(DAY FROM NOW() - dc.first_detected_at) >= 14 AND EXTRACT(DAY FROM NOW() - dc.first_detected_at) < 30 AND COUNT(cp.id) < 2) OR
  (EXTRACT(DAY FROM NOW() - dc.first_detected_at) >= 7 AND EXTRACT(DAY FROM NOW() - dc.first_detected_at) < 14 AND COUNT(cp.id) < 1)
)
ORDER BY age_days DESC;
```

**Expected:** Empty result set (all eligible horizons computed).

## 2. Evidence Completeness

Resolved changes (validated/regressed) should have at least one checkpoint.

```sql
-- Resolved changes without any checkpoints
SELECT
  dc.id,
  dc.element,
  dc.status,
  dc.first_detected_at,
  dc.correlation_metrics
FROM detected_changes dc
LEFT JOIN change_checkpoints cp ON cp.change_id = dc.id
WHERE dc.status IN ('validated', 'regressed')
GROUP BY dc.id
HAVING COUNT(cp.id) = 0;
```

**Expected:** Empty result set. Any rows here are changes resolved via legacy correlation (pre-checkpoint engine) — acceptable for pre-existing data.

## 3. State Parity

Canonical progress (composed from DB) should match what's stored on the latest analysis.

```sql
-- Compare counts from detected_changes vs latest analysis progress
SELECT
  p.id AS page_id,
  p.url,
  (SELECT COUNT(*) FROM detected_changes WHERE page_id = p.id AND status = 'validated') AS db_validated,
  (SELECT COUNT(*) FROM detected_changes WHERE page_id = p.id AND status = 'regressed') AS db_regressed,
  (SELECT COUNT(*) FROM detected_changes WHERE page_id = p.id AND status = 'watching') AS db_watching,
  (a.changes_summary->'progress'->>'validated')::int AS stored_validated,
  (a.changes_summary->'progress'->>'watching')::int AS stored_watching
FROM pages p
JOIN analyses a ON a.id = p.last_scan_id
WHERE p.last_scan_id IS NOT NULL
  AND a.changes_summary IS NOT NULL;
```

**Expected:** `db_validated + db_regressed = stored_validated` and `db_watching = stored_watching` for each row. Small discrepancies may exist if a checkpoint resolved between the last scan and now.

## 4. Attribution Language

Manual audit. After deploying Step 7:
- Check Chronicle evidence panel for confidence-banded text
- Check dashboard ProofBanner WinCards for attribution text
- Check email preview at `/api/dev/email-preview?template=correlation-unlocked`
- Verify no instances of "caused" language

## 5. Outcome Feedback

Already shipped (Phase 5). Verify data exists:

```sql
SELECT
  COUNT(*) AS total_feedback,
  COUNT(*) FILTER (WHERE feedback_type = 'accurate') AS accurate,
  COUNT(*) FILTER (WHERE feedback_type = 'inaccurate') AS inaccurate
FROM outcome_feedback;
```

## 6. Long-Window Proof

Time-gated: D+30 checkpoints require changes ≥30 days old. Earliest possible:
- First changes detected ~Jan 17, 2026
- D+30 earliest = Feb 16, 2026
- D+60 earliest = Mar 18, 2026
- D+90 earliest = Apr 17, 2026

```sql
-- Check which horizons have been computed so far
SELECT
  horizon_days,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE assessment = 'improved') AS improved,
  COUNT(*) FILTER (WHERE assessment = 'regressed') AS regressed,
  COUNT(*) FILTER (WHERE assessment IN ('neutral', 'inconclusive')) AS neutral_or_inconclusive
FROM change_checkpoints
GROUP BY horizon_days
ORDER BY horizon_days;
```

**Expected:** At least D+7 and D+14 rows exist. D+30+ will fill in as changes age.
