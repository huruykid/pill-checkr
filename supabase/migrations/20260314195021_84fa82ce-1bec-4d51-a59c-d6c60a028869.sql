
CREATE TYPE public.pill_scoring AS ENUM ('none', 'single', 'double', 'quad', 'other');

ALTER TABLE public.pill_reference
  ADD COLUMN size_mm numeric NULL,
  ADD COLUMN thickness_mm numeric NULL,
  ADD COLUMN scoring public.pill_scoring NULL;

ALTER TABLE public.reports
  ADD COLUMN estimated_size_mm numeric NULL,
  ADD COLUMN scoring public.pill_scoring NULL;
