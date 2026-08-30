-- Reconcile the community-alerts schema with the documented design.
--
-- History: 20260821000000_community_alerts.sql and
-- 20260822000000_report_locations.sql were written but never applied; the
-- applied 20260829172854 migration re-created most of their surface in a
-- different shape (report_locations keyed on created_at, no moderation flag,
-- no length caps, no map view). Those two files are removed from the repo and
-- everything still wanted from them is folded forward here, so a fresh replay
-- and production converge on the same schema.

-- 1. Moderation flag + hex/display columns from the original design.
ALTER TABLE public.counterfeit_reports
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hex_res SMALLINT DEFAULT 6,
  -- Day-resolution timestamp for public display; created_at stays exact for admins.
  ADD COLUMN IF NOT EXISTS occurred_on DATE DEFAULT CURRENT_DATE;

-- 2. Value + length caps so the anonymous insert policy can't be used to dump junk.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'counterfeit_reports_imprint_len') THEN
    ALTER TABLE public.counterfeit_reports
      ADD CONSTRAINT counterfeit_reports_imprint_len CHECK (imprint IS NULL OR char_length(imprint) <= 40),
      ADD CONSTRAINT counterfeit_reports_drug_len CHECK (drug_name IS NULL OR char_length(drug_name) <= 80),
      ADD CONSTRAINT counterfeit_reports_city_len CHECK (city IS NULL OR char_length(city) <= 80),
      ADD CONSTRAINT counterfeit_reports_state_len CHECK (state IS NULL OR char_length(state) <= 40),
      ADD CONSTRAINT counterfeit_reports_notes_len CHECK (notes IS NULL OR char_length(notes) <= 500),
      ADD CONSTRAINT counterfeit_reports_hex_len CHECK (hex_cell IS NULL OR char_length(hex_cell) <= 20),
      ADD CONSTRAINT counterfeit_reports_strip_chk CHECK (strip_result IS NULL OR strip_result IN ('positive', 'negative', 'not_tested')),
      ADD CONSTRAINT counterfeit_reports_type_chk CHECK (report_type IN ('pill', 'overdose')),
      ADD CONSTRAINT counterfeit_reports_tier_chk CHECK (evidence_tier IN ('lab', 'strip', 'suspected_opioid', 'visual'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS counterfeit_reports_feed_idx
  ON public.counterfeit_reports (state, city, created_at DESC);
CREATE INDEX IF NOT EXISTS counterfeit_reports_hex_idx
  ON public.counterfeit_reports (hex_cell, created_at DESC) WHERE hidden = false;

-- 3. Feed view: hidden reports drop out; still no notes, photos, or coordinates.
DROP VIEW IF EXISTS public.counterfeit_reports_public;
CREATE VIEW public.counterfeit_reports_public AS
SELECT id, drug_name, imprint, strip_result, risk_level, city, state,
       report_type, evidence_tier, hex_cell, occurred_on, created_at
FROM public.counterfeit_reports
WHERE hidden = false;

GRANT SELECT ON public.counterfeit_reports_public TO anon, authenticated;

-- 4. Public map view: hex cells only, never coordinates, day-resolution time.
CREATE OR REPLACE VIEW public.report_map_public AS
SELECT
  hex_cell,
  hex_res,
  report_type,
  evidence_tier,
  strip_result,
  state,
  count(*)         AS report_count,
  max(occurred_on) AS last_reported_on
FROM public.counterfeit_reports
WHERE hidden = false
  AND hex_cell IS NOT NULL
GROUP BY hex_cell, hex_res, report_type, evidence_tier, strip_result, state;

GRANT SELECT ON public.report_map_public TO anon, authenticated;

-- 5. Admins moderate (set hidden) and can clean up precise points early.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.counterfeit_reports'::regclass
      AND polname = 'Admins can moderate counterfeit reports'
  ) THEN
    CREATE POLICY "Admins can moderate counterfeit reports"
      ON public.counterfeit_reports FOR UPDATE
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.report_locations'::regclass
      AND polname = 'Admins can delete precise locations'
  ) THEN
    CREATE POLICY "Admins can delete precise locations"
      ON public.report_locations FOR DELETE
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
