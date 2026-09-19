-- Area alert push subscriptions (iOS, opt-in).
--
-- One push when a fentanyl-positive strip is reported in the subscriber's
-- state, at most once per device every 6 hours. The contract:
--   * a subscription is a device token + a 2-letter state (+ optional city
--     for the message text). No coordinates, no hex cell, no account link;
--   * the table has RLS and NO policies: anon/authenticated can only call
--     the two SECURITY DEFINER RPCs below, so tokens are never readable
--     from the API (same posture as report_throttle);
--   * turning alerts off deletes the row. Apple 410 / BadDeviceToken
--     deletes the row. Privacy.tsx states all of this — keep them in sync.

CREATE TABLE IF NOT EXISTS public.alert_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_token TEXT NOT NULL UNIQUE CHECK (char_length(device_token) BETWEEN 32 AND 200),
  platform TEXT NOT NULL DEFAULT 'ios' CHECK (platform IN ('ios')),
  state TEXT NOT NULL CHECK (char_length(state) = 2),
  city TEXT CHECK (city IS NULL OR char_length(city) <= 80),
  lang TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'es', 'fr', 'pt')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_notified_at TIMESTAMPTZ,
  failures SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS alert_subscriptions_state_idx
  ON public.alert_subscriptions (state, last_notified_at);

ALTER TABLE public.alert_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.alert_subscriptions FROM anon, authenticated;
-- No policies on purpose.

CREATE OR REPLACE FUNCTION public.subscribe_area_alerts(
  p_token TEXT,
  p_state TEXT,
  p_city TEXT DEFAULT NULL,
  p_lang TEXT DEFAULT 'en'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state TEXT := upper(trim(coalesce(p_state, '')));
  v_lang  TEXT := CASE WHEN p_lang IN ('en','es','fr','pt') THEN p_lang ELSE 'en' END;
BEGIN
  IF char_length(v_state) <> 2 THEN
    RAISE EXCEPTION 'invalid_state' USING HINT = 'State must be a 2-letter USPS code.';
  END IF;
  INSERT INTO public.alert_subscriptions (device_token, state, city, lang)
  VALUES (p_token, v_state, left(NULLIF(trim(coalesce(p_city, '')), ''), 80), v_lang)
  ON CONFLICT (device_token) DO UPDATE
    SET state = EXCLUDED.state,
        city = EXCLUDED.city,
        lang = EXCLUDED.lang,
        updated_at = now(),
        failures = 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.unsubscribe_area_alerts(p_token TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.alert_subscriptions WHERE device_token = p_token;
$$;

REVOKE ALL ON FUNCTION public.subscribe_area_alerts(TEXT, TEXT, TEXT, TEXT) FROM public;
REVOKE ALL ON FUNCTION public.unsubscribe_area_alerts(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.subscribe_area_alerts(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unsubscribe_area_alerts(TEXT) TO anon, authenticated;

-- Sender bookkeeping. counterfeit_reports_public lists its columns
-- explicitly, so this never reaches the feed, the map, or the API.
ALTER TABLE public.counterfeit_reports
  ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS counterfeit_reports_notify_idx
  ON public.counterfeit_reports (created_at)
  WHERE notified_at IS NULL AND strip_result = 'positive' AND hidden = false;

-- Every 15 minutes: fan out new positive-strip reports to subscribers.
-- Same pg_cron + pg_net pattern (and public anon key) as purge-anon-images.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
     AND NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notify-area-alerts-15m') THEN
    PERFORM cron.schedule(
      'notify-area-alerts-15m',
      '*/15 * * * *',
      $job$
      SELECT net.http_post(
        url := 'https://ptisltjfqomavvlnghcm.supabase.co/functions/v1/notify-area-alerts',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0aXNsdGpmcW9tYXZ2bG5naGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTEwMTksImV4cCI6MjA4MTgyNzAxOX0.UhSrnGadMooBIrP0pca13GQz9QSr1OrB5ZgAHjoHMgs"}'::jsonb,
        body := '{"scheduled": true}'::jsonb
      ) AS request_id;
      $job$
    );
  END IF;
END $$;
