-- California wave (Oct 2026): LA County LAHAN alerts, San Francisco monthly
-- overdose deaths and weekly EMS overdose calls, and LA County accidental
-- overdose deaths by ZIP and drug type.
--
-- The SF and LA datasets are AGGREGATES (counts per area per period), which
-- is a fifth evidence kind: not a case, not an incident, not an alert. They
-- get their own table so a "26 deaths in 90003 in 2020–21" is never confused
-- with 26 case records.

CREATE TABLE IF NOT EXISTS public.overdose_area_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL REFERENCES public.external_sources(id) ON DELETE CASCADE,
  source_record_id text NOT NULL,            -- area|period|metric|category, stable
  area_type text NOT NULL CHECK (area_type IN ('state','county','city','zip','spa','district','neighborhood','tract')),
  area_id text NOT NULL,                     -- ZIP, FIPS, or a slug of the name
  area_name text,
  state text,                                -- USPS
  lat double precision,                      -- area centroid
  lon double precision,
  period_start date NOT NULL,
  period_end date NOT NULL,                  -- inclusive
  period_label text,                         -- "2020–21", "Aug 2026", "Week 14 2026"
  metric text NOT NULL CHECK (metric IN ('deaths','ems_calls','ed_visits','naloxone','hospitalizations')),
  drug_category text NOT NULL DEFAULT 'all', -- all | any_opioid | fentanyl | heroin | methamphetamine | alcohol | ...
  value numeric,                             -- NULL = suppressed upstream
  rate numeric,                              -- per 100k when the source publishes one
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  shape_version int NOT NULL DEFAULT 1,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, source_record_id)
);
CREATE INDEX IF NOT EXISTS overdose_area_periods_area_idx ON public.overdose_area_periods (state, area_type, area_id);
CREATE INDEX IF NOT EXISTS overdose_area_periods_period_idx ON public.overdose_area_periods (period_end DESC);

ALTER TABLE public.overdose_area_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "overdose_area_periods_public_read" ON public.overdose_area_periods;
CREATE POLICY "overdose_area_periods_public_read" ON public.overdose_area_periods
  FOR SELECT USING (true);

CREATE OR REPLACE VIEW public.overdose_area_periods_public
WITH (security_invoker = on) AS
  SELECT id, source_id, area_type, area_id, area_name, state, lat, lon,
         period_start, period_end, period_label, metric, drug_category, value, rate
  FROM public.overdose_area_periods;

INSERT INTO public.external_sources
  (id, name, organization, homepage_url, data_url, license_note, attribution_text, description)
VALUES
('la_county_lahan',
 'Los Angeles County Health Alert Network (LAHAN)',
 'Los Angeles County Department of Public Health',
 'https://publichealth.lacounty.gov/lahan/',
 'https://publichealth.lacounty.gov/lahan/',
 'Public health alerts published openly by LA County DPH, which also distributes CDC and CDPH notices; titles and dates reproduced with attribution and a link to each original document.',
 'Alerts: Los Angeles County Department of Public Health (LAHAN)',
 'Los Angeles County''s official health alerts about the drug supply — medetomidine in the fentanyl supply, fatal 7-OH (kratom extract) overdoses — plus the CDC and California notices the county relays to local providers.'),
('sf_ocme_monthly_deaths',
 'San Francisco unintentional overdose deaths (monthly)',
 'San Francisco Office of the Chief Medical Examiner, via SF Department of Public Health',
 'https://data.sf.gov/d/jxrr-bmra',
 'https://data.sf.gov/resource/jxrr-bmra.json',
 'Open Data Commons Open Database License (ODbL): attribution required; a database built on it must be shared under the same terms. Citywide monthly counts only.',
 'Deaths: San Francisco OCME preliminary monthly counts (ODbL)',
 'Preliminary count of accidental drug overdose deaths in San Francisco each month since 2020, updated monthly by the Medical Examiner. Recent months are revised as cases close.'),
('sf_ems_overdose_911',
 'San Francisco overdose-related 911 EMS responses (weekly)',
 'San Francisco Department of Public Health / EMS',
 'https://data.sf.gov/d/ed3a-sn39',
 'https://data.sf.gov/resource/ed3a-sn39.json',
 'Public Domain Dedication and License (PDDL). Citywide weekly counts.',
 'EMS: San Francisco overdose-related 911 responses (PDDL)',
 'Weekly count of 911 responses in San Francisco that EMS classified as overdose-related, since 2022. A citywide pulse of nonfatal overdoses.'),
('la_county_zip_overdose',
 'Los Angeles County accidental overdose deaths by ZIP code',
 'Los Angeles County Department of Public Health (eGIS)',
 'https://lacounty.maps.arcgis.com/home/item.html?id=d82e2d9e8cf145579076d965b09c3ca1',
 'https://services.arcgis.com/RmCCgQtiZLDCtblq/arcgis/rest/services/Accidental_drug_overdose_deaths_by_Zip_Code/FeatureServer/0',
 'LA County Enterprise GIS Terms of Use (informational use; county may change or discontinue access). Pooled two-year counts per ZIP, 2018–19 and 2020–21, by drug type.',
 'Deaths by ZIP: Los Angeles County Department of Public Health',
 'Accidental drug overdose deaths in each Los Angeles County ZIP code for 2018–19 and 2020–21, broken out by fentanyl, methamphetamine, heroin, any opioid and alcohol. The most local view of LA''s overdose geography that the county publishes; it is historical, not current.')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, organization = EXCLUDED.organization, homepage_url = EXCLUDED.homepage_url,
  data_url = EXCLUDED.data_url, license_note = EXCLUDED.license_note,
  attribution_text = EXCLUDED.attribution_text, description = EXCLUDED.description;

DO $$
DECLARE
  base text := 'https://ptisltjfqomavvlnghcm.supabase.co/functions/v1/';
  hdrs jsonb := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0aXNsdGpmcW9tYXZ2bG5naGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTEwMTksImV4cCI6MjA4MTgyNzAxOX0.UhSrnGadMooBIrP0pca13GQz9QSr1OrB5ZgAHjoHMgs"}'::jsonb;
BEGIN
  IF NOT (EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
          AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')) THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-area-stats-daily') THEN
    PERFORM cron.schedule('sync-area-stats-daily', '10 6 * * *',
      format($job$ SELECT net.http_post(url := %L, headers := %L::jsonb, body := '{"scheduled": true}'::jsonb) AS request_id; $job$,
             base || 'sync-area-stats', hdrs::text));
  END IF;
END $$;
