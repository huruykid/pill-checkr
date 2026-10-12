-- Partner stats: an outreach group that hands out QR stickers/posters can see
-- totals for its own ?c= code, and nothing else.
--
--   * Access is by an unguessable link token, not by the code itself (codes
--     like "fresno-outreach" are guessable). Admins mint and revoke tokens.
--   * partner_stats() reads ONLY the nightly app_events_daily rollup, never
--     raw app_events, and returns three window totals (7 / 30 days, all
--     time) — no per-day series, no strip results, no state.
--   * Privacy.tsx discloses this — keep them in sync.

CREATE TABLE IF NOT EXISTS public.partner_links (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source ~ '^[a-z0-9_-]{1,40}$'),
  label TEXT CHECK (label IS NULL OR char_length(label) <= 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

ALTER TABLE public.partner_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage partner links" ON public.partner_links;
CREATE POLICY "Admins manage partner links"
  ON public.partner_links FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Anyone holding a valid, unrevoked token gets its code's totals. An unknown
-- or revoked token returns no rows (indistinguishable from each other).
CREATE OR REPLACE FUNCTION public.partner_stats(p_token UUID)
RETURNS TABLE (
  label TEXT,
  source TEXT,
  period TEXT,
  scans BIGINT,
  first_checks BIGINT,
  strips_logged BIGINT,
  updated_through DATE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH link AS (
    SELECT l.label, l.source
    FROM public.partner_links l
    WHERE l.token = p_token AND l.revoked_at IS NULL
  ),
  rows AS (
    SELECT d.day, d.event, d.events
    FROM public.app_events_daily d, link
    WHERE lower(d.source) = link.source
      AND d.event IN ('qr_landing', 'first_check', 'strip_logged')
  ),
  periods(period, since) AS (
    VALUES ('7d', CURRENT_DATE - 7), ('30d', CURRENT_DATE - 30), ('all', DATE '2000-01-01')
  )
  SELECT
    link.label,
    link.source,
    p.period,
    COALESCE(sum(r.events) FILTER (WHERE r.event = 'qr_landing'), 0),
    COALESCE(sum(r.events) FILTER (WHERE r.event = 'first_check'), 0),
    COALESCE(sum(r.events) FILTER (WHERE r.event = 'strip_logged'), 0),
    (SELECT max(day) FROM public.app_events_daily)
  FROM link
  CROSS JOIN periods p
  LEFT JOIN rows r ON r.day >= p.since
  GROUP BY link.label, link.source, p.period;
$$;

REVOKE ALL ON FUNCTION public.partner_stats(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.partner_stats(UUID) TO anon, authenticated;
