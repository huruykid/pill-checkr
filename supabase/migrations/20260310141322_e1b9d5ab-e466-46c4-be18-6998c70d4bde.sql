ALTER TABLE public.counterfeit_reports
  ADD COLUMN IF NOT EXISTS location_lat double precision,
  ADD COLUMN IF NOT EXISTS location_lng double precision,
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT true;