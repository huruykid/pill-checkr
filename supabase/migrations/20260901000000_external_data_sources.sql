-- External verified data sources (starting with the UNC Street Drug Analysis Lab).
-- Community reports stay in counterfeit_reports; externally sourced lab data
-- lives here, with provenance surfaced to users (source name, link, attribution).
-- Locations are county centroids at most - no precise coordinates, no PII.

CREATE TABLE public.external_sources (
  id text PRIMARY KEY,                       -- slug, e.g. 'unc_drugchecking'
  name text NOT NULL,
  organization text NOT NULL,
  homepage_url text NOT NULL,
  data_url text NOT NULL,
  license_note text NOT NULL,                -- plain-language reuse terms
  attribution_text text NOT NULL,            -- the exact credit line shown in the UI
  description text NOT NULL,                 -- plain-language "what is this data"
  enabled boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.external_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL REFERENCES public.external_sources(id) ON DELETE CASCADE,
  source_record_id text NOT NULL,            -- upstream sample id; upsert key with source_id
  substance_expected text,                   -- what the sample was sold/stamped as
  substances_detected text[] NOT NULL DEFAULT '{}',
  lab_flags jsonb NOT NULL DEFAULT '{}'::jsonb,  -- lab_fentanyl, lab_xylazine_any, ... true/false/null
  sample_type text,
  is_pill boolean NOT NULL DEFAULT false,
  county text,
  state text,                                -- 2-letter abbreviation
  lat double precision,                      -- county centroid, never exact
  lon double precision,
  geo_precision text NOT NULL DEFAULT 'county'
    CHECK (geo_precision IN ('exact','city','county','state')),
  collected_on date,
  completed_on date,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,    -- upstream row as received (shape drifts; keep the original)
  shape_version int NOT NULL DEFAULT 1,      -- bump when the normalizer's input contract changes
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, source_record_id)
);

CREATE INDEX external_reports_state_county_idx ON public.external_reports (state, county);
CREATE INDEX external_reports_collected_idx ON public.external_reports (collected_on DESC);
CREATE INDEX external_reports_source_idx ON public.external_reports (source_id);

ALTER TABLE public.external_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_reports ENABLE ROW LEVEL SECURITY;

-- Read-only for everyone (aggregate, county-level, no PII).
-- No INSERT/UPDATE/DELETE policies: writes happen only through the service role
-- (sync edge functions), which bypasses RLS.
CREATE POLICY "external_sources_public_read" ON public.external_sources
  FOR SELECT USING (true);
CREATE POLICY "external_reports_public_read" ON public.external_reports
  FOR SELECT USING (true);

-- Public view mirroring the counterfeit_reports_public pattern:
-- only the fields the UI needs; raw payload stays out of client queries.
CREATE OR REPLACE VIEW public.external_reports_public
WITH (security_invoker = on) AS
  SELECT id, source_id, substance_expected, substances_detected, lab_flags,
         sample_type, is_pill, county, state, lat, lon, geo_precision, collected_on
  FROM public.external_reports;

INSERT INTO public.external_sources
  (id, name, organization, homepage_url, data_url, license_note, attribution_text, description)
VALUES (
  'unc_drugchecking',
  'UNC Street Drug Analysis Lab',
  'University of North Carolina',
  'https://www.streetsafe.supply/',
  'https://raw.githubusercontent.com/opioiddatalab/drugchecking/main/datasets/analysis_dataset.csv',
  'Open data. Attribution expected; authorship not required.',
  'Data: UNC Street Drug Analysis Lab (streetsafe.supply)',
  'Real lab results from community-submitted street drug samples, analyzed by the UNC Street Drug Analysis Lab. Locations are approximate (county level).'
);

-- Nightly sync at 04:15 UTC - same pg_cron + pg_net pattern as the purge job.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
     AND NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-unc-drugchecking-daily') THEN
    PERFORM cron.schedule(
      'sync-unc-drugchecking-daily',
      '15 4 * * *',
      $job$
      SELECT net.http_post(
        url := 'https://ptisltjfqomavvlnghcm.supabase.co/functions/v1/sync-unc-drugchecking',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0aXNsdGpmcW9tYXZ2bG5naGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTEwMTksImV4cCI6MjA4MTgyNzAxOX0.UhSrnGadMooBIrP0pca13GQz9QSr1OrB5ZgAHjoHMgs"}'::jsonb,
        body := '{"scheduled": true}'::jsonb
      ) AS request_id;
      $job$
    );
  END IF;
END $$;
