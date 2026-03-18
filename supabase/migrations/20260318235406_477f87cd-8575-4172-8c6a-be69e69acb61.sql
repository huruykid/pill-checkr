
-- Add requires_higher_confidence column to pill_reference
ALTER TABLE public.pill_reference
  ADD COLUMN requires_higher_confidence boolean NOT NULL DEFAULT false;

-- Create get_feedback_stats RPC function
CREATE OR REPLACE FUNCTION public.get_feedback_stats(days_back integer DEFAULT 7)
RETURNS TABLE(drug_name text, helpful_count bigint, unhelpful_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    m.drug_name,
    COUNT(*) FILTER (WHERE mf.helpful = true) AS helpful_count,
    COUNT(*) FILTER (WHERE mf.helpful = false) AS unhelpful_count
  FROM match_feedback mf
  JOIN matches m ON m.id = mf.match_id
  WHERE mf.created_at >= now() - (days_back || ' days')::interval
    AND mf.match_id IS NOT NULL
  GROUP BY m.drug_name;
$$;
