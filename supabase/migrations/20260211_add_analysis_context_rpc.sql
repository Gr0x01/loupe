-- Consolidates 5 timeline queries into 1 for /api/analysis/[id]
-- Returns scan position, prev/next IDs, and baseline date in a single call
CREATE OR REPLACE FUNCTION get_analysis_context(
  p_user_id uuid,
  p_url text,
  p_created_at timestamptz
) RETURNS TABLE (
  scan_number bigint,
  total_scans bigint,
  prev_analysis_id uuid,
  next_analysis_id uuid,
  baseline_date timestamptz
) LANGUAGE sql STABLE AS $$
  WITH numbered AS (
    SELECT
      id,
      created_at,
      ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn,
      COUNT(*) OVER () as total,
      LAG(id) OVER (ORDER BY created_at ASC) as prev_id,
      LEAD(id) OVER (ORDER BY created_at ASC) as next_id,
      FIRST_VALUE(created_at) OVER (ORDER BY created_at ASC) as baseline
    FROM analyses
    WHERE user_id = p_user_id AND url = p_url
  )
  SELECT rn, total, prev_id, next_id, baseline
  FROM numbered
  WHERE created_at = p_created_at;
$$;
