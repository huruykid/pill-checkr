-- 1. Extend counterfeit_reports with community-alert fields
ALTER TABLE public.counterfeit_reports
  ADD COLUMN IF NOT EXISTS imprint text,
  ADD COLUMN IF NOT EXISTS strip_result text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS report_type text NOT NULL DEFAULT 'pill',
  ADD COLUMN IF NOT EXISTS evidence_tier text NOT NULL DEFAULT 'visual',
  ADD COLUMN IF NOT EXISTS hex_cell text;

-- 2. Restricted precise-location table
CREATE TABLE IF NOT EXISTS public.report_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.counterfeit_reports(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  precision text NOT NULL DEFAULT 'precise',
  place_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.report_locations TO anon, authenticated;
GRANT ALL ON public.report_locations TO service_role;

ALTER TABLE public.report_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a location point"
  ON public.report_locations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Only admins can read precise locations"
  ON public.report_locations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Public view: add imprint, strip_result, hex_cell (never notes/photo/GPS)
DROP VIEW IF EXISTS public.counterfeit_reports_public;
CREATE VIEW public.counterfeit_reports_public AS
SELECT id, drug_name, imprint, strip_result, risk_level, city, state, hex_cell, created_at
FROM public.counterfeit_reports;

GRANT SELECT ON public.counterfeit_reports_public TO anon, authenticated;

-- 4. 30-day retention purge for precise points (privacy policy requirement)
CREATE OR REPLACE FUNCTION public.purge_expired_report_locations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.report_locations
  WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Schedule daily purge at 03:30 UTC (pg_cron)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-report-locations') THEN
      PERFORM cron.schedule('purge-report-locations', '30 3 * * *', 'SELECT public.purge_expired_report_locations();');
    END IF;
  END IF;
END $$;