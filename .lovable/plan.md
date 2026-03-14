

## Plan: Fuzzy Imprint Matching via pg_trgm

### Problem
Pass 1 uses `ilike '%M30%'` which fails for OCR errors like `M3O`, `MBO`, `M 30`. Users get no matches when the AI misreads a character.

### Approach
Enable PostgreSQL's `pg_trgm` extension and create a database function that finds similar imprints using trigram similarity. Use it as a fallback in the edge function when exact `ilike` returns few results.

### Changes

**1. Database migration** — Enable pg_trgm + create fuzzy search function

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.fuzzy_imprint_search(
  search_text text,
  similarity_threshold float DEFAULT 0.3,
  max_results int DEFAULT 20
)
RETURNS TABLE (
  id uuid, drug_name text, imprint text, shape pill_shape, color pill_color,
  notes text, source text, external_id text, ndc_code text,
  size_mm numeric, thickness_mm numeric, scoring scoring_type,
  logo_description text, created_at timestamptz, last_synced timestamptz,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.*, similarity(pr.imprint, search_text) AS similarity
  FROM pill_reference pr
  WHERE similarity(pr.imprint, search_text) >= similarity_threshold
  ORDER BY similarity DESC
  LIMIT max_results;
$$;
```

**2. Edge function** — `supabase/functions/analyze-pill/index.ts`

After Pass 1's `ilike` search (around line 562), add a fuzzy fallback:

- If Pass 1 returned < 3 results and `finalImprint` exists, call `supabase.rpc('fuzzy_imprint_search', { search_text: finalImprint })` 
- Merge results into `references`, deduplicating by ID
- Track as Pass 1 hits (same pass for cross-pass agreement scoring)
- Do the same for `finalBackImprint` if it exists
- Log how many fuzzy matches were added

This catches OCR errors like `M3O` → `M30` (similarity ~0.5), `OC 80` → `0C 80`, `XANAX` → `XANX`, etc.

### No other files change
The Results page and scoring logic remain unchanged — fuzzy matches just feed more candidates into the existing scoring pipeline.

