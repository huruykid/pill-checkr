-- National data sources, wave 1 (Oct 2026).
--
-- Stamped's record of dangerous drug supplies has three kinds of evidence, and
-- this migration gives each its own table so they are never conflated:
--   external_reports   lab results on street samples        (exists: UNC, testRI)
--   external_deaths    medical-examiner / coroner drug deaths (NEW)
--   external_incidents nonfatal EMS / 911 overdose responses  (NEW)
--   external_alerts    official advisories                    (exists: CFSRE; + state/local)
-- A death is NOT a detection in the supply, and an EMS run is NOT a death. Each
-- table carries its own evidence semantics and each row keeps its upstream
-- payload in `raw` because open-data shapes drift.
--
-- Privacy contract for the two new tables: no names, no case numbers, no age,
-- sex or race, no street addresses, no exact coordinates. Upstream point
-- locations are reduced to an H3 res-6 cell (~36 km²) in the edge function,
-- and lat/lon stored here are that cell's center or a county/city centroid.

-- ---------------------------------------------------------------------------
-- external_deaths
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.external_deaths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL REFERENCES public.external_sources(id) ON DELETE CASCADE,
  source_record_id text NOT NULL,            -- upstream row key (never a human-readable case number when avoidable)
  death_date date,
  date_precision text NOT NULL DEFAULT 'day' CHECK (date_precision IN ('day','month','year')),
  manner text,                               -- 'accident' | 'undetermined' | 'pending' | other upstream value, lowercased
  substances text[] NOT NULL DEFAULT '{}',   -- normalized names parsed from the cause of death
  flags jsonb NOT NULL DEFAULT '{}'::jsonb,  -- fentanyl, xylazine, medetomidine, nitazene, carfentanil, any_opioid, stimulant: true/false
  cause_text text,                           -- cause of death as published (public record, no PII)
  city text,
  county text,
  state text,                                -- USPS code
  zip text,
  hex_cell text,                             -- H3 res 6 when the upstream gave a point
  lat double precision,                      -- hex center or county/city centroid, never exact
  lon double precision,
  geo_precision text NOT NULL DEFAULT 'county'
    CHECK (geo_precision IN ('hex','zip','city','county','state')),
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  shape_version int NOT NULL DEFAULT 1,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, source_record_id)
);
CREATE INDEX IF NOT EXISTS external_deaths_state_county_idx ON public.external_deaths (state, county);
CREATE INDEX IF NOT EXISTS external_deaths_date_idx ON public.external_deaths (death_date DESC);
CREATE INDEX IF NOT EXISTS external_deaths_hex_idx ON public.external_deaths (hex_cell);
CREATE INDEX IF NOT EXISTS external_deaths_flags_idx ON public.external_deaths USING gin (flags);

ALTER TABLE public.external_deaths ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "external_deaths_public_read" ON public.external_deaths;
CREATE POLICY "external_deaths_public_read" ON public.external_deaths
  FOR SELECT USING (true);
-- No write policies: the sync functions use the service role.

CREATE OR REPLACE VIEW public.external_deaths_public
WITH (security_invoker = on) AS
  SELECT id, source_id, death_date, date_precision, manner, substances, flags,
         city, county, state, zip, hex_cell, lat, lon, geo_precision
  FROM public.external_deaths;

-- Rolling 12-month counts per hex cell / county for the map and the near-me feed.
CREATE OR REPLACE VIEW public.external_deaths_recent_cells
WITH (security_invoker = on) AS
  SELECT state, county, hex_cell, lat, lon, geo_precision,
         count(*)::int AS deaths,
         count(*) FILTER (WHERE (flags->>'fentanyl')::boolean) ::int AS fentanyl_deaths,
         count(*) FILTER (WHERE (flags->>'xylazine')::boolean) ::int AS xylazine_deaths,
         count(*) FILTER (WHERE (flags->>'medetomidine')::boolean) ::int AS medetomidine_deaths,
         max(death_date) AS latest_death
  FROM public.external_deaths
  WHERE death_date >= (CURRENT_DATE - INTERVAL '12 months')::date
  GROUP BY state, county, hex_cell, lat, lon, geo_precision;

-- ---------------------------------------------------------------------------
-- external_incidents (nonfatal EMS / 911 overdose responses)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.external_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL REFERENCES public.external_sources(id) ON DELETE CASCADE,
  source_record_id text NOT NULL,
  occurred_at timestamptz,
  occurred_on date,
  incident_type text NOT NULL
    CHECK (incident_type IN ('ems_overdose','ems_opioid','naloxone_administered','911_overdose')),
  naloxone boolean,                          -- true when the upstream says naloxone was given; null = unknown
  count int NOT NULL DEFAULT 1,              -- >1 only for sources that publish daily counts per area
  city text,
  county text,
  state text,
  zip text,
  hex_cell text,
  lat double precision,
  lon double precision,
  geo_precision text NOT NULL DEFAULT 'hex'
    CHECK (geo_precision IN ('hex','zip','city','county','state')),
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  shape_version int NOT NULL DEFAULT 1,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, source_record_id)
);
CREATE INDEX IF NOT EXISTS external_incidents_occurred_idx ON public.external_incidents (occurred_on DESC);
CREATE INDEX IF NOT EXISTS external_incidents_hex_idx ON public.external_incidents (hex_cell);
CREATE INDEX IF NOT EXISTS external_incidents_state_idx ON public.external_incidents (state, city);

ALTER TABLE public.external_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "external_incidents_public_read" ON public.external_incidents;
CREATE POLICY "external_incidents_public_read" ON public.external_incidents
  FOR SELECT USING (true);

CREATE OR REPLACE VIEW public.external_incidents_public
WITH (security_invoker = on) AS
  SELECT id, source_id, occurred_on, incident_type, naloxone, count,
         city, county, state, zip, hex_cell, lat, lon, geo_precision
  FROM public.external_incidents;

-- Last 30 days per cell: the "what is happening near me right now" layer.
CREATE OR REPLACE VIEW public.external_incidents_recent_cells
WITH (security_invoker = on) AS
  SELECT state, city, hex_cell, lat, lon, geo_precision,
         sum(count)::int AS incidents,
         sum(count) FILTER (WHERE naloxone)::int AS naloxone_incidents,
         max(occurred_on) AS latest
  FROM public.external_incidents
  WHERE occurred_on >= (CURRENT_DATE - INTERVAL '30 days')::date
  GROUP BY state, city, hex_cell, lat, lon, geo_precision;

-- ---------------------------------------------------------------------------
-- external_alerts: state/local issuers need a locality label and a date
-- precision (some archives list alerts by year only).
-- ---------------------------------------------------------------------------
ALTER TABLE public.external_alerts
  ADD COLUMN IF NOT EXISTS locality text,          -- "Philadelphia", "New York City", "Washington"
  ADD COLUMN IF NOT EXISTS issuer text,            -- "Philadelphia Dept. of Public Health"
  ADD COLUMN IF NOT EXISTS date_precision text NOT NULL DEFAULT 'day'
    CHECK (date_precision IN ('day','month','year'));

-- Columns are inserted mid-list, which CREATE OR REPLACE VIEW refuses; drop first.
DROP VIEW IF EXISTS public.external_alerts_public;
CREATE VIEW public.external_alerts_public
WITH (security_invoker = on) AS
  SELECT id, source_id, source_record_id, title, published_on, date_precision, url, pdf_url, image_url,
         summary, substances, severity, region, locality, issuer, synced_at
  FROM public.external_alerts;

-- ---------------------------------------------------------------------------
-- Source registry
-- ---------------------------------------------------------------------------
INSERT INTO public.external_sources
  (id, name, organization, homepage_url, data_url, license_note, attribution_text, description)
VALUES
-- Medical examiner / coroner case data ---------------------------------------
('cook_county_me',
 'Cook County Medical Examiner case archive',
 'Cook County, Illinois',
 'https://datacatalog.cookcountyil.gov/Public-Safety/Medical-Examiner-Case-Archive/cjeq-bs86',
 'https://datacatalog.cookcountyil.gov/resource/cjeq-bs86.json',
 'Public domain (Cook County Open Data). No names, case numbers, ages or exact locations are stored; points are reduced to a ~36 km² hex cell.',
 'Deaths: Cook County Medical Examiner (Illinois)',
 'Accidental drug deaths investigated by the Cook County Medical Examiner (Chicago area), with the substances named in the cause of death. Updated daily by the county; usually 2–8 weeks behind because toxicology takes time.'),
('santa_clara_me',
 'Santa Clara County Medical Examiner-Coroner cases',
 'County of Santa Clara, California',
 'https://data.sccgov.org/Health/Medical-Examiner-Coroner-Full-dataset/s3fb-yrjp',
 'https://data.sccgov.org/resource/s3fb-yrjp.json',
 'County open data portal (nightly). No license field published; reproduced as aggregate public-record data with attribution. No names, case numbers or exact locations are stored.',
 'Deaths: Santa Clara County Medical Examiner-Coroner (California)',
 'Accidental drug deaths in Santa Clara County (San José area) with the substances named in the cause of death. The county updates this nightly.'),
('san_diego_me',
 'San Diego County Medical Examiner cases',
 'County of San Diego, California',
 'https://data.sandiegocounty.gov/Safety/Medical-Examiner-Cases/jkvb-n4p7',
 'https://data.sandiegocounty.gov/resource/jkvb-n4p7.json',
 'County open data portal (monthly). The county excludes names, dates of birth, case numbers and addresses before publishing. Reproduced with attribution at county level.',
 'Deaths: San Diego County Medical Examiner (California)',
 'Accidental drug deaths in San Diego County with the substances named in the cause of death and the county''s own opioid / fentanyl flag. Updated monthly, through the prior month.'),
('connecticut_ocme',
 'Connecticut accidental drug-related deaths',
 'Connecticut Office of the Chief Medical Examiner',
 'https://data.ct.gov/Health-and-Human-Services/Accidental-Drug-Related-Deaths-2012-2024/rybz-nyjw',
 'https://data.ct.gov/resource/rybz-nyjw.json',
 'Public domain (data.ct.gov). Statewide, every accidental drug death since 2012 with per-substance flags including fentanyl and xylazine. Locations are town centroids.',
 'Deaths: Connecticut Office of the Chief Medical Examiner',
 'Every accidental drug-related death in Connecticut since 2012, with the medical examiner''s per-substance flags (fentanyl, fentanyl analogs, xylazine, cocaine, methamphetamine and more). Published once a year, so it shows history rather than this month.'),
('allegheny_me',
 'Allegheny County fatal accidental overdoses',
 'Allegheny County Medical Examiner via the Western Pennsylvania Regional Data Center',
 'https://data.wprdc.org/dataset/allegheny-county-fatal-accidental-overdoses',
 'https://data.wprdc.org/api/3/action/datastore_search?resource_id=1c59b26a-1684-4bfb-92f7-205b947530cf',
 'Creative Commons CC0 (WPRDC). ZIP-code level; closed cases only. No ages or case identifiers are stored.',
 'Deaths: Allegheny County Medical Examiner (Pennsylvania), via WPRDC',
 'Fatal accidental overdoses in Allegheny County (Pittsburgh) since 2008, with up to ten substances named per death. Updated monthly as cases close.'),
('sacramento_coroner',
 'Sacramento County fentanyl-related drug deaths',
 'Sacramento County Coroner via Sacramento County GIS',
 'https://data.saccounty.gov/datasets/drug-deaths',
 'https://services1.arcgis.com/5NARefyPVtAeuJPU/arcgis/rest/services/Drug_Deaths/FeatureServer/0',
 'Creative Commons CC0 1.0 (Sacramento County open data). ZIP-code level. No case numbers or personal details are stored.',
 'Deaths: Sacramento County Coroner (California)',
 'Fentanyl-related deaths in Sacramento County over the last five years, by ZIP code, with the coroner''s cause-of-death text. This dataset only includes deaths where fentanyl was involved.'),
-- Nonfatal EMS / 911 ---------------------------------------------------------
('seattle_fire_911',
 'Seattle Fire 911 overdose responses',
 'City of Seattle (Seattle Fire Department real-time 911)',
 'https://data.seattle.gov/Public-Safety/Seattle-Real-Time-Fire-911-Calls/kzjm-xkqj',
 'https://data.seattle.gov/resource/kzjm-xkqj.json',
 'Public domain (City of Seattle Open Data). Dispatch records typed as overdose responses; addresses are dropped and points reduced to a hex cell.',
 'EMS: Seattle Fire Department 911 dispatch (Washington)',
 'Seattle Fire Department medic responses dispatched as overdoses, from the city''s real-time 911 feed. A dispatch type is not a confirmed overdose, but a cluster of them in one area in one day is a real signal. Refreshes every few minutes upstream.'),
('cincinnati_fire_ems',
 'Cincinnati Fire/EMS overdose responses',
 'City of Cincinnati (Cincinnati Fire Department CAD)',
 'https://data.cincinnati-oh.gov/Safety/Cincinnati-Fire-Incidents-CAD-including-EMS-ALS-BL/vnsz-a3wp',
 'https://data.cincinnati-oh.gov/resource/vnsz-a3wp.json',
 'Public domain (City of Cincinnati Open Data). Incidents typed as heroin/opioid/overdose; street names are dropped and points reduced to a hex cell.',
 'EMS: Cincinnati Fire Department (Ohio)',
 'Cincinnati Fire/EMS runs dispatched as heroin, opioid or overdose incidents, from the city''s daily computer-aided-dispatch feed.'),
('tempe_fire_opioid',
 'Tempe Fire Medical Rescue opioid EMS calls',
 'City of Tempe, Arizona',
 'https://data.tempe.gov/datasets/opioid-ems-calls',
 'https://services.arcgis.com/lQySeXwbBg53XWDi/arcgis/rest/services/Opioid_Calls/FeatureServer/0',
 'Creative Commons CC BY 4.0 (City of Tempe). Coordinates are already truncated upstream; reduced further to a hex cell.',
 'EMS: Tempe Fire Medical Rescue (Arizona), CC BY 4.0',
 'EMS calls in Tempe where crews judged probable opioid use, with whether naloxone was given. Continuous since 2017.'),
('baltimore_fire_naloxone',
 'Baltimore City Fire Department naloxone administrations',
 'Baltimore City Fire Department via Open Baltimore',
 'https://data.baltimorecity.gov/datasets/baltimore-city-fire-department-clinician-administered-naloxone',
 'https://services1.arcgis.com/UWYHeuuJISiGmgXx/arcgis/rest/services/Baltimore_City_Fire_Department_Clinician_Administered_Naloxone_new/FeatureServer/0',
 'Creative Commons CC BY 3.0 (Open Baltimore). Daily counts per ZIP code; no incident-level detail.',
 'EMS: Baltimore City Fire Department clinician-administered naloxone, CC BY 3.0',
 'Daily counts of naloxone given by Baltimore City Fire Department clinicians, by ZIP code, since 2020.'),
-- Official advisories --------------------------------------------------------
('philly_pdph_han',
 'Philadelphia Health Alert Network',
 'Philadelphia Department of Public Health',
 'https://hip.phila.gov/health-alerts/',
 'https://hip.phila.gov/health-alerts/',
 'Public health alerts published openly by the City of Philadelphia; titles and dates reproduced with attribution and a link to each original document.',
 'Alerts: Philadelphia Department of Public Health (Health Information Portal)',
 'Philadelphia''s official health alerts about the drug supply: medetomidine, xylazine, nitazenes, carfentanil and counterfeit pills, as they were detected in the city.'),
('nyc_dohmh_han',
 'New York City Health Alert Network',
 'NYC Department of Health and Mental Hygiene',
 'https://www.nyc.gov/site/doh/providers/resources/health-alert-network.page',
 'https://www.nyc.gov/site/doh/providers/resources/health-alert-network.page',
 'Public health alerts published openly by the City of New York; titles reproduced with attribution and a link to each original document. The archive lists alerts by year, so dates are year-level.',
 'Alerts: NYC Department of Health and Mental Hygiene (HAN)',
 'New York City''s official health alerts and advisories about the drug supply, including xylazine, medetomidine, bromazolam and carfentanil detections.'),
('wa_doh_han',
 'Washington State Health Alert Network (incl. CDC relays)',
 'Washington State Department of Health',
 'https://doh.wa.gov/public-health-provider-resources/washington-health-alert-network',
 'https://doh.wa.gov/public-health-provider-resources/washington-health-alert-network',
 'Public listing by the Washington State Department of Health, which republishes CDC Health Alert Network notices alongside its own; titles and dates reproduced with attribution and a link to each original.',
 'Alerts: Washington State Department of Health HAN (relaying CDC HAN)',
 'National CDC Health Alert Network notices (for example the 2026 medetomidine alert) and Washington State alerts, as listed by the Washington State Department of Health.'),
('baltimore_bchd_news',
 'Baltimore City Health Department news',
 'Baltimore City Health Department',
 'https://www.baltimorecity.gov/health/news',
 'https://www.baltimorecity.gov/health/news',
 'Public news releases by the City of Baltimore; drug-supply items only, titles and dates reproduced with attribution and a link.',
 'Alerts: Baltimore City Health Department',
 'Baltimore City Health Department releases about the local drug supply, such as the ongoing medetomidine warnings.')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, organization = EXCLUDED.organization, homepage_url = EXCLUDED.homepage_url,
  data_url = EXCLUDED.data_url, license_note = EXCLUDED.license_note,
  attribution_text = EXCLUDED.attribution_text, description = EXCLUDED.description;

-- ---------------------------------------------------------------------------
-- Schedules (pg_cron + pg_net, same pattern as the other sync jobs). Each
-- function loops over its sources and never lets one failing source abort the
-- rest, so one job per table is enough.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  base text := 'https://ptisltjfqomavvlnghcm.supabase.co/functions/v1/';
  hdrs jsonb := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0aXNsdGpmcW9tYXZ2bG5naGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTEwMTksImV4cCI6MjA4MTgyNzAxOX0.UhSrnGadMooBIrP0pca13GQz9QSr1OrB5ZgAHjoHMgs"}'::jsonb;
BEGIN
  IF NOT (EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
          AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')) THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-me-deaths-daily') THEN
    PERFORM cron.schedule('sync-me-deaths-daily', '45 4 * * *',
      format($job$ SELECT net.http_post(url := %L, headers := %L::jsonb, body := '{"scheduled": true}'::jsonb) AS request_id; $job$,
             base || 'sync-me-deaths', hdrs::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-od-incidents-hourly') THEN
    PERFORM cron.schedule('sync-od-incidents-hourly', '20 * * * *',
      format($job$ SELECT net.http_post(url := %L, headers := %L::jsonb, body := '{"scheduled": true}'::jsonb) AS request_id; $job$,
             base || 'sync-od-incidents', hdrs::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-health-alerts-daily') THEN
    PERFORM cron.schedule('sync-health-alerts-daily', '35 5 * * *',
      format($job$ SELECT net.http_post(url := %L, headers := %L::jsonb, body := '{"scheduled": true}'::jsonb) AS request_id; $job$,
             base || 'sync-health-alerts', hdrs::text));
  END IF;
END $$;
