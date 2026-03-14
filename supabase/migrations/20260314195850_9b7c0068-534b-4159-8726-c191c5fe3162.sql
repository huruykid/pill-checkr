
ALTER TABLE public.pill_reference
  ADD COLUMN logo_description text NULL;

ALTER TABLE public.reports
  ADD COLUMN detected_logos jsonb NULL;
