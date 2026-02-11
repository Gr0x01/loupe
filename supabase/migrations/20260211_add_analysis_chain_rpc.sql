-- Replaces N+1 history walk with single recursive CTE query
-- Walks the parent_analysis_id chain from a starting analysis
-- Security: Only returns analyses where user_id is NULL (legacy) or matches p_user_id
-- Safety: Depth limit of 100 prevents infinite loops from data corruption
CREATE OR REPLACE FUNCTION get_analysis_chain(
  p_start_id uuid,
  p_user_id uuid
) RETURNS TABLE (
  id uuid,
  url text,
  status text,
  changes_summary jsonb,
  created_at timestamptz,
  parent_analysis_id uuid
) LANGUAGE sql STABLE AS $$
  WITH RECURSIVE chain AS (
    -- Anchor: Start from the given analysis (with ownership check)
    SELECT a.id, a.url, a.status, a.changes_summary,
           a.created_at, a.parent_analysis_id, a.user_id,
           1 AS depth
    FROM analyses a
    WHERE a.id = p_start_id
      AND (a.user_id IS NULL OR a.user_id = p_user_id)

    UNION ALL

    -- Recursive: Follow parent chain with ownership + depth check
    SELECT a.id, a.url, a.status, a.changes_summary,
           a.created_at, a.parent_analysis_id, a.user_id,
           c.depth + 1
    FROM analyses a
    INNER JOIN chain c ON a.id = c.parent_analysis_id
    WHERE (a.user_id IS NULL OR a.user_id = p_user_id)
      AND c.depth < 100
  )
  SELECT chain.id, chain.url, chain.status, chain.changes_summary,
         chain.created_at, chain.parent_analysis_id
  FROM chain;
$$;
