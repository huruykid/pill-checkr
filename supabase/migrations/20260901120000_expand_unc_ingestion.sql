-- Expand external data: sample images + county centroid lookup for the full
-- UNC multistate ingestion (~10.5k samples across 15+ states; the previous
-- sync used UNC's 20-row example file).

ALTER TABLE public.external_reports ADD COLUMN IF NOT EXISTS image_url text;

-- County centroids (population-weighted, derived from US Census data) keyed by
-- 5-digit FIPS. Loaded by the sync function on first run.
CREATE TABLE IF NOT EXISTS public.county_centroids (
  fips text PRIMARY KEY,
  lat double precision NOT NULL,
  lon double precision NOT NULL
);
ALTER TABLE public.county_centroids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "county_centroids_public_read" ON public.county_centroids
  FOR SELECT USING (true);

CREATE OR REPLACE VIEW public.external_reports_public
WITH (security_invoker = on) AS
  SELECT id, source_id, substance_expected, substances_detected, lab_flags,
         sample_type, is_pill, county, state, lat, lon, geo_precision,
         collected_on, image_url
  FROM public.external_reports;

-- State counts for the lab-results state picker (national reference data;
-- independent of the community "near me" scope).
CREATE OR REPLACE VIEW public.external_reports_state_counts
WITH (security_invoker = on) AS
  SELECT state, count(*)::int AS n
  FROM public.external_reports
  WHERE state IS NOT NULL
  GROUP BY state;
