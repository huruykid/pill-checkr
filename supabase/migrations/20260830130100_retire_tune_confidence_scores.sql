-- Retire the legacy tune-confidence-scores tooling: unschedule its weekly
-- cron job. The edge function is deleted from the repo in the same commit.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'tune-confidence-scores-weekly') THEN
    PERFORM cron.unschedule('tune-confidence-scores-weekly');
  END IF;
END $$;
