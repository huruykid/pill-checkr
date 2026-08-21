-- Community Alerts feed: standalone "what I found" reports with an imprint
-- and a categorical strip result. No GPS, no photo, no free-text exposed publicly.

ALTER TABLE public.counterfeit_reports
  ADD COLUMN IF NOT EXISTS imprint TEXT,
  ADD COLUMN IF NOT EXISTS strip_result TEXT NOT NULL DEFAULT 'not_tested'
    CHECK (strip_result IN ('positive', 'negative', 'not_tested')),
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'app';

-- Length caps so the anonymous insert policy can't be used to dump junk.
ALTER TABLE public.counterfeit_reports
  ADD CONSTRAINT counterfeit_reports_imprint_len CHECK (imprint IS NULL OR char_length(imprint) <= 40),
  ADD CONSTRAINT counterfeit_reports_drug_len CHECK (drug_name IS NULL OR char_length(drug_name) <= 80),
  ADD CONSTRAINT counterfeit_reports_city_len CHECK (city IS NULL OR char_length(city) <= 80),
  ADD CONSTRAINT counterfeit_reports_state_len CHECK (state IS NULL OR char_length(state) <= 40),
  ADD CONSTRAINT counterfeit_reports_notes_len CHECK (notes IS NULL OR char_length(notes) <= 500);

CREATE INDEX IF NOT EXISTS counterfeit_reports_feed_idx
  ON public.counterfeit_reports (state, city, created_at DESC);

-- Public view: only the safe columns. notes/photo/GPS stay admin-only.
CREATE OR REPLACE VIEW public.counterfeit_reports_public
WITH (security_invoker = false)
AS
SELECT id, city, state, risk_level, drug_name, imprint, strip_result, created_at
FROM public.counterfeit_reports;

GRANT SELECT ON public.counterfeit_reports_public TO anon, authenticated;
