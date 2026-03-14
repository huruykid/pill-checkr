CREATE INDEX IF NOT EXISTS idx_pill_reference_imprint_trgm
ON public.pill_reference USING gin (imprint gin_trgm_ops);

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS shared boolean NOT NULL DEFAULT false;

CREATE POLICY "Anyone can view shared reports" ON public.reports
  FOR SELECT TO public USING (shared = true);