-- testRI (Rhode Island) historical drug-checking results, imported by the
-- import-testri edge function from the public results table at
-- https://preventoverdoseri.org/test-ri/. The study concluded in 2023, so this
-- is a one-time import (re-runnable) rather than a scheduled sync.
INSERT INTO public.external_sources
  (id, name, organization, homepage_url, data_url, license_note, attribution_text, description)
VALUES (
  'testri_ri',
  'testRI drug checking (Rhode Island, 2022–2024)',
  'Prevent Overdose RI / Rhode Island Hospital toxicology laboratory',
  'https://preventoverdoseri.org/test-ri/',
  'https://preventoverdoseri.org/test-ri/',
  'Public results table published by Prevent Overdose RI (Rhode Island Governor''s Overdose Task Force); reproduced with attribution and a link to the source.',
  'Data: testRI study, Prevent Overdose RI (funded by FORE)',
  '203 street samples collected across Rhode Island between 2022 and early 2024 and tested at the Rhode Island Hospital toxicology lab for the testRI study. The study has ended, so these show what the supply looked like then — not today. Dates are month-level; locations are the town where each sample was collected, shown at county level.'
)
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, name = EXCLUDED.name, attribution_text = EXCLUDED.attribution_text;
