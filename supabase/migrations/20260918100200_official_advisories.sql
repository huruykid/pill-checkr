-- Official advisories: the honest seed for Community Alerts.
--
-- The feed is purely community-sourced and starts empty in every region.
-- Public-health departments, medical examiners, DEA field divisions, and
-- poison control centers publish counterfeit-pill advisories that are
-- exactly what a person needs to see on day one. They are a different
-- thing from community reports: they carry an issuer and a source URL, do
-- not go through the report throttle, must never appear in the community
-- feed/map/API as "community reports", and must never sit under the
-- "unverified and community-sourced" disclaimer. Hence a separate table,
-- not a flag on counterfeit_reports (whose `source` column already means
-- the originating screen).

CREATE TABLE IF NOT EXISTS public.official_advisories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 140),
  summary TEXT CHECK (summary IS NULL OR char_length(summary) <= 500),
  issuer TEXT NOT NULL CHECK (char_length(issuer) BETWEEN 2 AND 120),
  source_url TEXT NOT NULL CHECK (source_url ~ '^https://'),
  state TEXT NOT NULL CHECK (char_length(state) = 2),
  city TEXT CHECK (city IS NULL OR char_length(city) <= 80),
  drug_name TEXT CHECK (drug_name IS NULL OR char_length(drug_name) <= 80),
  imprint TEXT CHECK (imprint IS NULL OR char_length(imprint) <= 40),
  published_on DATE NOT NULL,
  expires_on DATE,
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS official_advisories_state_idx
  ON public.official_advisories (state, published_on DESC);

ALTER TABLE public.official_advisories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage advisories" ON public.official_advisories;
CREATE POLICY "Admins manage advisories"
  ON public.official_advisories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public read goes through a view that hides moderation and authorship
-- columns and drops hidden/expired rows. Plain view (no security_invoker)
-- so anon can read it while the base table stays admin-only.
DROP VIEW IF EXISTS public.official_advisories_public;
CREATE VIEW public.official_advisories_public AS
SELECT id, title, summary, issuer, source_url, state, city, drug_name, imprint, published_on
FROM public.official_advisories
WHERE hidden = false AND (expires_on IS NULL OR expires_on >= CURRENT_DATE);

GRANT SELECT ON public.official_advisories_public TO anon, authenticated;
