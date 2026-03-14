
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.fuzzy_imprint_search(
  search_text text,
  similarity_threshold float DEFAULT 0.3,
  max_results int DEFAULT 20
)
RETURNS TABLE (
  id uuid, drug_name text, imprint text, shape pill_shape, color pill_color,
  notes text, source text, external_id text, ndc_code text,
  size_mm numeric, thickness_mm numeric, scoring pill_scoring,
  logo_description text, created_at timestamptz, last_synced timestamptz,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.id, pr.drug_name, pr.imprint, pr.shape, pr.color,
         pr.notes, pr.source, pr.external_id, pr.ndc_code,
         pr.size_mm, pr.thickness_mm, pr.scoring,
         pr.logo_description, pr.created_at, pr.last_synced,
         similarity(pr.imprint, search_text) AS similarity
  FROM pill_reference pr
  WHERE similarity(pr.imprint, search_text) >= similarity_threshold
  ORDER BY similarity DESC
  LIMIT max_results;
$$;
