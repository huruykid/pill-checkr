-- Full per-sample substance detail from UNC lab_detail datasets (one row per
-- substance per sample; primary vs trace). substances_detected now carries the
-- lab's standardized chemical names in priority order; substances_trace holds
-- trace-level detections separately so cards never overstate them.

ALTER TABLE public.external_reports
  ADD COLUMN IF NOT EXISTS substances_trace text[] NOT NULL DEFAULT '{}';

-- Column order changes, so the view must be dropped rather than replaced.
DROP VIEW IF EXISTS public.external_reports_public;
CREATE VIEW public.external_reports_public
WITH (security_invoker = on) AS
  SELECT id, source_id, substance_expected, substances_detected, substances_trace, lab_flags,
         sample_type, is_pill, county, state, lat, lon, geo_precision,
         collected_on, image_url
  FROM public.external_reports;
