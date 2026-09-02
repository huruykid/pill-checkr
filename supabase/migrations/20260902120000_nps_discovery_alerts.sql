-- CFSRE NPS Discovery public health alerts (https://www.cfsre.org/nps-discovery/public-alerts).
-- National early-warning notices about newly detected substances and adulterants
-- (nitazenes, carfentanil, BTMPS, medetomidine, ...). Scraped daily from the
-- public listing; each alert keeps its title, date, summary, PDF and thumbnail.
-- Shown as the "Early warning" strip at the top of the Alerts feed.

CREATE TABLE IF NOT EXISTS public.external_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL REFERENCES public.external_sources(id) ON DELETE CASCADE,
  source_record_id text NOT NULL,            -- stable slug from the source URL
  title text NOT NULL,
  published_on date,
  url text,                                  -- human-readable alert page
  pdf_url text,                              -- the alert document itself
  image_url text,                            -- first-page thumbnail when published
  summary text,                              -- plain text, source's own words
  substances text[] NOT NULL DEFAULT '{}',   -- normalized names mentioned in the alert
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('danger', 'warning', 'info')),
  region text NOT NULL DEFAULT 'US',
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,    -- parsed fields as scraped
  shape_version int NOT NULL DEFAULT 1,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, source_record_id)
);
CREATE INDEX IF NOT EXISTS external_alerts_published_idx ON public.external_alerts (published_on DESC);

ALTER TABLE public.external_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "external_alerts_public_read" ON public.external_alerts;
CREATE POLICY "external_alerts_public_read" ON public.external_alerts
  FOR SELECT USING (true);

CREATE OR REPLACE VIEW public.external_alerts_public
WITH (security_invoker = on) AS
  SELECT id, source_id, source_record_id, title, published_on, url, pdf_url, image_url,
         summary, substances, severity, region, synced_at
  FROM public.external_alerts;

INSERT INTO public.external_sources
  (id, name, organization, homepage_url, data_url, license_note, attribution_text, description)
VALUES (
  'cfsre_nps_discovery',
  'NPS Discovery early-warning alerts',
  'Center for Forensic Science Research and Education (CFSRE)',
  'https://www.cfsre.org/nps-discovery/public-alerts',
  'https://www.cfsre.org/nps-discovery/public-alerts',
  'Public health alerts published openly by CFSRE; summaries reproduced with attribution and linked to the original document.',
  'Alerts: CFSRE NPS Discovery (with DEA / Colombo Plan partners)',
  'National early-warning notices from the forensic lab that tracks new drugs entering the US supply — for example new nitazene opioids, carfentanil in fake pills, or adulterants like BTMPS and medetomidine. Each alert links to the original document.'
)
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, name = EXCLUDED.name;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
     AND NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-nps-alerts-daily') THEN
    PERFORM cron.schedule(
      'sync-nps-alerts-daily',
      '15 5 * * *',
      $job$
      SELECT net.http_post(
        url := 'https://ptisltjfqomavvlnghcm.supabase.co/functions/v1/sync-nps-alerts',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0aXNsdGpmcW9tYXZ2bG5naGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTEwMTksImV4cCI6MjA4MTgyNzAxOX0.UhSrnGadMooBIrP0pca13GQz9QSr1OrB5ZgAHjoHMgs"}'::jsonb,
        body := '{"scheduled": true}'::jsonb
      ) AS request_id;
      $job$
    );
  END IF;
END $$;
