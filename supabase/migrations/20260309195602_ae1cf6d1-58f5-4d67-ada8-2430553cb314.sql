
CREATE TABLE public.drug_info_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_name text UNIQUE NOT NULL,
  label_data jsonb,
  adverse_events_data jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.drug_info_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drug info cache is publicly readable"
  ON public.drug_info_cache
  FOR SELECT
  TO public
  USING (true);
