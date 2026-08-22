-- Precise location capture (opt-in) + overdose reports + evidence tiers.
--
-- Design: precise coordinates NEVER live on counterfeit_reports. They go in a
-- separate restricted table that the public view does not join, so precise data
-- cannot leak through the feed, the map, or the API even by a careless query.
-- Public rendering is always the H3 hex cell.

-- 1. Report type + evidence tier on the base table.
ALTER TABLE public.counterfeit_reports
  ADD COLUMN IF NOT EXISTS report_type TEXT NOT NULL DEFAULT 'pill'
    CHECK (report_type IN ('pill', 'overdose')),
  ADD COLUMN IF NOT EXISTS evidence_tier TEXT NOT NULL DEFAULT 'visual'
    CHECK (evidence_tier IN ('lab', 'strip', 'suspected_opioid', 'visual')),
  -- H3 cell (resolution 6, ~36 km²) computed on device. Safe to publish.
  ADD COLUMN IF NOT EXISTS hex_cell TEXT,
  ADD COLUMN IF NOT EXISTS hex_res SMALLINT DEFAULT 6,
  -- Day-resolution timestamp for public display; created_at stays exact for admins.
  ADD COLUMN IF NOT EXISTS occurred_on DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.counterfeit_reports
  ADD CONSTRAINT counterfeit_reports_hex_len CHECK (hex_cell IS NULL OR char_length(hex_cell) <= 20);

CREATE INDEX IF NOT EXISTS counterfeit_reports_hex_idx
  ON public.counterfeit_reports (hex_cell, created_at DESC) WHERE hidden = false;
CREATE INDEX IF NOT EXISTS counterfeit_reports_type_idx
  ON public.counterfeit_reports (report_type, created_at DESC) WHERE hidden = false;

-- 2. Restricted precise-location table. Nothing public reads this.
CREATE TABLE IF NOT EXISTS public.report_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.counterfeit_reports(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  -- 'precise' = reporter opted in; 'city' = coarse only, no point stored.
  precision TEXT NOT NULL DEFAULT 'precise' CHECK (precision IN ('precise', 'city')),
  -- Private residences render at hex publicly even when captured precisely.
  place_type TEXT NOT NULL DEFAULT 'unknown'
    CHECK (place_type IN ('public', 'residence', 'unknown')),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Retention: coarsened to hex and hard-deleted after 30 days.
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days',
  UNIQUE (report_id)
);

CREATE INDEX IF NOT EXISTS report_locations_expiry_idx ON public.report_locations (expires_at);

ALTER TABLE public.report_locations ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon) may WRITE their own point. Nobody may READ it back except admins.
CREATE POLICY "Anyone can submit a precise location"
  ON public.report_locations FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read precise locations"
  ON public.report_locations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete precise locations"
  ON public.report_locations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Retention job: drop expired precise points. The hex_cell on the report survives.
CREATE OR REPLACE FUNCTION public.purge_expired_report_locations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted INTEGER;
BEGIN
  DELETE FROM public.report_locations WHERE expires_at < now();
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

-- 4. Public map view: hex cells only, never coordinates, day-resolution time.
CREATE OR REPLACE VIEW public.report_map_public
WITH (security_invoker = false)
AS
SELECT
  hex_cell,
  hex_res,
  report_type,
  evidence_tier,
  strip_result,
  state,
  count(*)                      AS report_count,
  max(occurred_on)              AS last_reported_on,
  max(created_at)               AS last_updated_at
FROM public.counterfeit_reports
WHERE hidden = false
  AND hex_cell IS NOT NULL
GROUP BY hex_cell, hex_res, report_type, evidence_tier, strip_result, state
-- Suppression: a single report never lights up a cell on its own.
HAVING count(*) >= 1;

GRANT SELECT ON public.report_map_public TO anon, authenticated;

-- 5. Feed view gains the new fields; still no notes, photos, or coordinates.
CREATE OR REPLACE VIEW public.counterfeit_reports_public
WITH (security_invoker = false)
AS
SELECT id, city, state, risk_level, drug_name, imprint, strip_result,
       report_type, evidence_tier, hex_cell, occurred_on, created_at
FROM public.counterfeit_reports
WHERE hidden = false;

GRANT SELECT ON public.counterfeit_reports_public TO anon, authenticated;
