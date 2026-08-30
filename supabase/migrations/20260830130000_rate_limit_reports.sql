-- Rate-limit anonymous community-report inserts (launch blocker).
--
-- The insert policy on counterfeit_reports is deliberately open (guest
-- reporting is the moat), so abuse control lives in a BEFORE INSERT trigger:
-- at most 5 reports per hour per connection. Only a salted one-way hash of
-- the connection address is kept, and only for 24 hours. Privacy.tsx states
-- this — keep them in sync.

CREATE TABLE IF NOT EXISTS public.report_throttle (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS report_throttle_ip_idx
  ON public.report_throttle (ip_hash, created_at DESC);

-- RLS with no policies: the API can never read or write this table; only
-- the SECURITY DEFINER trigger function touches it.
ALTER TABLE public.report_throttle ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.report_throttle FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.throttle_counterfeit_reports()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hdrs JSON;
  ip TEXT;
  iph TEXT;
  recent INT;
BEGIN
  -- Direct SQL (admin console, cron, service role) carries no PostgREST
  -- headers — never throttle it.
  BEGIN
    hdrs := current_setting('request.headers', true)::json;
  EXCEPTION WHEN OTHERS THEN
    hdrs := NULL;
  END;
  IF hdrs IS NULL THEN RETURN NEW; END IF;

  ip := COALESCE(
    NULLIF(hdrs->>'cf-connecting-ip', ''),
    NULLIF(split_part(hdrs->>'x-forwarded-for', ',', 1), ''),
    NULLIF(hdrs->>'x-real-ip', '')
  );
  IF ip IS NULL THEN RETURN NEW; END IF;

  iph := md5('pc_report_throttle:' || ip);

  SELECT count(*) INTO recent
  FROM public.report_throttle
  WHERE ip_hash = iph AND created_at > now() - interval '1 hour';

  IF recent >= 5 THEN
    RAISE EXCEPTION 'rate_limited'
      USING HINT = 'Too many reports from this connection. Try again in an hour.';
  END IF;

  INSERT INTO public.report_throttle (ip_hash) VALUES (iph);

  -- Opportunistic cleanup: hashes never outlive 24 hours.
  IF random() < 0.01 THEN
    DELETE FROM public.report_throttle WHERE created_at < now() - interval '24 hours';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS throttle_counterfeit_reports_trigger ON public.counterfeit_reports;
CREATE TRIGGER throttle_counterfeit_reports_trigger
  BEFORE INSERT ON public.counterfeit_reports
  FOR EACH ROW EXECUTE FUNCTION public.throttle_counterfeit_reports();

-- One precise point per report (the design's UNIQUE(report_id) never made it
-- to production) — also closes direct spam inserts against report_locations.
CREATE UNIQUE INDEX IF NOT EXISTS report_locations_report_id_key
  ON public.report_locations (report_id);
