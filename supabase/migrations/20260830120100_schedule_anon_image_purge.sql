-- Nightly purge of anonymous pill photos (pill-images/anon/, 30-day retention).
-- The privacy policy states anonymous photos are deleted after 30 days; the
-- purge-anon-images edge function enforces it and this job invokes it nightly.
-- Same pg_cron + pg_net pattern (and public anon key) as the existing
-- dailymed/rximage jobs.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
     AND NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-anon-images-daily') THEN
    PERFORM cron.schedule(
      'purge-anon-images-daily',
      '45 3 * * *',
      $job$
      SELECT net.http_post(
        url := 'https://ptisltjfqomavvlnghcm.supabase.co/functions/v1/purge-anon-images',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0aXNsdGpmcW9tYXZ2bG5naGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTEwMTksImV4cCI6MjA4MTgyNzAxOX0.UhSrnGadMooBIrP0pca13GQz9QSr1OrB5ZgAHjoHMgs"}'::jsonb,
        body := '{"scheduled": true}'::jsonb
      ) AS request_id;
      $job$
    );
  END IF;
END $$;
