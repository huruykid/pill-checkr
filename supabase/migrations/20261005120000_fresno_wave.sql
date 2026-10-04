-- Fresno wave (Oct 2026): Fresno County Sheriff-Coroner annual overdose deaths.
--
-- Fresno County publishes no machine-readable overdose data. Verified Oct 2026
-- from this project's database (same egress as the edge functions):
--   * ArcGIS Online, the County of Fresno Hub and the City of Fresno Hub have
--     zero public items matching overdose / opioid / fentanyl / naloxone;
--   * fresnocountyca.gov (Dept. of Public Health, Behavioral Health) returns
--     Akamai 403 to cloud runtimes; fresno.gov (Fire) returns nginx 403;
--     healthyfresnocountydata.org never answers (25 s timeout).
--   * fresnosheriff.org is reachable and posts one coroner statistics PDF per
--     year. Those county-level annual counts are transcribed into a curated
--     module (supabase/functions/_shared/curated/fresno_coroner_annual.ts) and
--     upserted by sync-area-stats into overdose_area_periods. No new table,
--     no new schedule: the existing daily sync-area-stats job covers it.

INSERT INTO public.external_sources
  (id, name, organization, homepage_url, data_url, license_note, attribution_text, description)
VALUES
('fresno_sheriff_coroner_annual',
 'Fresno County accidental overdose deaths (annual coroner statistics)',
 'Fresno County Sheriff-Coroner''s Office',
 'https://www.fresnosheriff.org/coroner.html',
 'https://www.fresnosheriff.org/images/pdfs/2024%20Coroner%20Statistics%20Final%20-%20Updated.pdf',
 'Annual statistical report published openly by a California county agency; no terms posted. Aggregate county-level counts (no case data) reproduced with attribution and a link to each report.',
 'Deaths: Fresno County Sheriff-Coroner annual statistics',
 'Accidental overdose deaths in Fresno County each year since 2009, with deaths involving fentanyl (2017→) and methamphetamine (2023→), as counted by the Sheriff-Coroner''s Office. Published once a year as a PDF, so the latest year is always the previous calendar year; the figures are transcribed by hand from the report and cross-checked between editions. Methamphetamine, not fentanyl, is the drug most often involved in Fresno County overdose deaths. This is a yearly county total, not case records or current supply data.')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, organization = EXCLUDED.organization, homepage_url = EXCLUDED.homepage_url,
  data_url = EXCLUDED.data_url, license_note = EXCLUDED.license_note,
  attribution_text = EXCLUDED.attribution_text, description = EXCLUDED.description;
