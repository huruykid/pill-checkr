-- First-party, privacy-preserving usage events.
--
-- Pill Checkr ships no third-party analytics SDK (Privacy.tsx promises this
-- and the App Privacy label mirrors it). Activation and retention are
-- measured with a small first-party table instead:
--   * anon can INSERT, nobody but admins can SELECT;
--   * rows carry a random per-install UUID, never an IP, user id,
--     imprint text, photo path, or coordinates;
--   * a per-install hourly cap stops abuse without recording IPs;
--   * raw rows are rolled up nightly into daily counts and deleted after
--     90 days.
-- Privacy.tsx discloses all of this — keep them in sync.

CREATE TABLE IF NOT EXISTS public.app_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event TEXT NOT NULL CHECK (event IN (
    'first_check', 'verdict_viewed', 'strip_logged', 'report_posted',
    'share_tapped', 'alerts_viewed_near', 'help_map_opened',
    'review_prompted', 'push_opted_in', 'store_badge_tapped', 'qr_landing'
  )),
  install_id UUID NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('web', 'ios')),
  app_version TEXT CHECK (app_version IS NULL OR char_length(app_version) <= 20),
  lang TEXT CHECK (lang IS NULL OR lang IN ('en', 'es', 'fr', 'pt')),
  state TEXT CHECK (state IS NULL OR char_length(state) = 2),
  source TEXT CHECK (source IS NULL OR char_length(source) <= 40),
  props JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(props) < 512)
);

CREATE INDEX IF NOT EXISTS app_events_day_idx ON public.app_events (created_at, event);
CREATE INDEX IF NOT EXISTS app_events_install_idx ON public.app_events (install_id, created_at DESC);

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can log events" ON public.app_events;
CREATE POLICY "Anyone can log events"
  ON public.app_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins read events" ON public.app_events;
CREATE POLICY "Admins read events"
  ON public.app_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No UPDATE/DELETE policies: events are append-only from the API.

-- Abuse cap: 120 events per install per hour. Keyed on the install id the
-- client already sends, so no connection address is ever stored.
CREATE OR REPLACE FUNCTION public.throttle_app_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent INT;
BEGIN
  SELECT count(*) INTO recent
  FROM public.app_events
  WHERE install_id = NEW.install_id AND created_at > now() - interval '1 hour';
  IF recent >= 120 THEN
    RAISE EXCEPTION 'rate_limited' USING HINT = 'Too many events from this install.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS throttle_app_events_trigger ON public.app_events;
CREATE TRIGGER throttle_app_events_trigger
  BEFORE INSERT ON public.app_events
  FOR EACH ROW EXECUTE FUNCTION public.throttle_app_events();

-- Daily rollup. This is what the admin Metrics tab reads; raw rows exist
-- only long enough to compute funnels and week-one retention.
CREATE TABLE IF NOT EXISTS public.app_events_daily (
  day DATE NOT NULL,
  event TEXT NOT NULL,
  platform TEXT NOT NULL,
  state TEXT,
  source TEXT,
  events INT NOT NULL,
  installs INT NOT NULL,
  PRIMARY KEY (day, event, platform, state, source)
);
ALTER TABLE public.app_events_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read daily events" ON public.app_events_daily;
CREATE POLICY "Admins read daily events"
  ON public.app_events_daily FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.rollup_app_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Re-aggregate the last 3 days so late-arriving rows are counted.
  DELETE FROM public.app_events_daily WHERE day >= (CURRENT_DATE - 3);
  INSERT INTO public.app_events_daily (day, event, platform, state, source, events, installs)
  SELECT
    (created_at AT TIME ZONE 'UTC')::date AS day,
    event,
    platform,
    COALESCE(state, ''),
    COALESCE(source, ''),
    count(*),
    count(DISTINCT install_id)
  FROM public.app_events
  WHERE created_at >= (CURRENT_DATE - 3)
  GROUP BY 1, 2, 3, 4, 5;

  -- Retention: raw events never outlive 90 days.
  DELETE FROM public.app_events WHERE created_at < now() - interval '90 days';
END;
$$;

-- Activation funnel over the last 30 days, per install.
CREATE OR REPLACE VIEW public.activation_funnel_30d
WITH (security_invoker = true) AS
WITH per_install AS (
  SELECT
    install_id,
    min(platform) AS platform,
    bool_or(event = 'first_check')  AS checked,
    bool_or(event = 'strip_logged') AS logged,
    bool_or(event = 'report_posted') AS posted,
    bool_or(event = 'share_tapped')  AS shared
  FROM public.app_events
  WHERE created_at > now() - interval '30 days'
  GROUP BY install_id
)
SELECT
  platform,
  count(*)                       AS installs_seen,
  count(*) FILTER (WHERE checked) AS first_check,
  count(*) FILTER (WHERE logged)  AS strip_logged,
  count(*) FILTER (WHERE posted)  AS report_posted,
  count(*) FILTER (WHERE shared)  AS share_tapped
FROM per_install
GROUP BY platform;

-- Week-one retention: installs first seen on a day that came back 6–8 days later.
CREATE OR REPLACE VIEW public.retention_d7
WITH (security_invoker = true) AS
WITH firsts AS (
  SELECT install_id, min(platform) AS platform, min(created_at)::date AS first_day
  FROM public.app_events
  GROUP BY install_id
),
returned AS (
  SELECT f.install_id, f.platform, f.first_day,
         bool_or(e.created_at::date BETWEEN f.first_day + 6 AND f.first_day + 8) AS came_back
  FROM firsts f
  JOIN public.app_events e ON e.install_id = f.install_id
  GROUP BY f.install_id, f.platform, f.first_day
)
SELECT platform, first_day AS cohort_day,
       count(*) AS installs,
       count(*) FILTER (WHERE came_back) AS returned_d7
FROM returned
WHERE first_day <= CURRENT_DATE - 8
GROUP BY platform, first_day
ORDER BY first_day DESC;

-- Views run as the caller (security_invoker), so the admin-only SELECT policy
-- on app_events applies; anon simply sees nothing.
GRANT SELECT ON public.activation_funnel_30d TO authenticated;
GRANT SELECT ON public.retention_d7 TO authenticated;

-- Nightly rollup + purge. Pure SQL, so pg_cron alone is enough.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rollup-app-events-daily') THEN
    PERFORM cron.schedule(
      'rollup-app-events-daily',
      '0 4 * * *',
      $job$ SELECT public.rollup_app_events(); $job$
    );
  END IF;
END $$;
