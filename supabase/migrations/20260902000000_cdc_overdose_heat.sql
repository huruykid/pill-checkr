-- CDC/NCHS provisional county-level drug overdose deaths (VSRR, data.cdc.gov
-- gb4e-yj24). 12-month-ending counts per county; CDC suppresses counts of 1-9
-- (stored as NULL deaths + footnote). Powers the national heat layer under the
-- lab-result pins so the map is meaningful in every county, not only the states
-- with a drug-checking program. Public-domain US government data.

CREATE TABLE IF NOT EXISTS public.overdose_county_periods (
  fips text NOT NULL,
  period_end date NOT NULL,            -- 12-month period ending this month
  state text,
  county text,
  deaths int,                          -- NULL = suppressed (1-9) or not reported
  pct_pending numeric,
  footnote text,
  data_as_of date,
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fips, period_end)
);
ALTER TABLE public.overdose_county_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "overdose_county_periods_public_read" ON public.overdose_county_periods;
CREATE POLICY "overdose_county_periods_public_read" ON public.overdose_county_periods
  FOR SELECT USING (true);

-- Latest period per county with prior-year comparison and centroid for the map.
CREATE OR REPLACE VIEW public.overdose_county_latest
WITH (security_invoker = on) AS
  WITH latest AS (SELECT max(period_end) AS pe FROM public.overdose_county_periods)
  SELECT o.fips, o.state, o.county, o.period_end, o.deaths, o.pct_pending, o.footnote,
         o.data_as_of, p.deaths AS deaths_prior, c.lat, c.lon
  FROM public.overdose_county_periods o
  JOIN latest ON o.period_end = latest.pe
  LEFT JOIN public.overdose_county_periods p
    ON p.fips = o.fips AND p.period_end = (o.period_end - INTERVAL '1 year')::date
  LEFT JOIN public.county_centroids c ON c.fips = o.fips;

INSERT INTO public.external_sources
  (id, name, organization, homepage_url, data_url, license_note, attribution_text, description)
VALUES (
  'cdc_vsrr_county',
  'CDC provisional overdose deaths by county',
  'CDC National Center for Health Statistics',
  'https://data.cdc.gov/National-Center-for-Health-Statistics/VSRR-Provisional-County-Level-Drug-Overdose-Death-/gb4e-yj24',
  'https://data.cdc.gov/resource/gb4e-yj24.json',
  'Public domain (US Government work).',
  'Data: CDC/NCHS Vital Statistics Rapid Release (provisional)',
  'Provisional counts of drug overdose deaths in every US county for the most recent 12 months, from death certificates. CDC hides counts of 1-9 for privacy, and provisional numbers usually undercount. Shown as the shaded background layer on the map.'
)
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, data_url = EXCLUDED.data_url;

-- Weekly refresh (CDC updates monthly). Same pg_cron + pg_net pattern.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
     AND NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-cdc-overdose-weekly') THEN
    PERFORM cron.schedule(
      'sync-cdc-overdose-weekly',
      '30 4 * * 1',
      $job$
      SELECT net.http_post(
        url := 'https://ptisltjfqomavvlnghcm.supabase.co/functions/v1/sync-cdc-overdose',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0aXNsdGpmcW9tYXZ2bG5naGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTEwMTksImV4cCI6MjA4MTgyNzAxOX0.UhSrnGadMooBIrP0pca13GQz9QSr1OrB5ZgAHjoHMgs"}'::jsonb,
        body := '{"scheduled": true}'::jsonb
      ) AS request_id;
      $job$
    );
  END IF;
END $$;
