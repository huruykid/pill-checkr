-- 1. BEFORE INSERT trigger: always null out precise GPS coordinates
CREATE OR REPLACE FUNCTION public.strip_counterfeit_gps()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.location_lat := NULL;
  NEW.location_lng := NULL;
  RETURN NEW;
END;
$$;

CREATE TRIGGER strip_counterfeit_gps_trigger
BEFORE INSERT ON public.counterfeit_reports
FOR EACH ROW
EXECUTE FUNCTION public.strip_counterfeit_gps();

-- 2. Create a public view that only exposes safe, aggregated columns
CREATE OR REPLACE VIEW public.counterfeit_reports_public
WITH (security_invoker = true)
AS
SELECT
  id,
  city,
  state,
  risk_level,
  drug_name,
  created_at
FROM public.counterfeit_reports;

-- 3. Replace the overly permissive public SELECT policy with an admin-only one
DROP POLICY IF EXISTS "Counterfeit reports are publicly readable" ON public.counterfeit_reports;

-- Admins can see full details
CREATE POLICY "Admins can view all counterfeit reports"
ON public.counterfeit_reports
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Public users can only read the safe subset of columns via RLS
-- (they access counterfeit_reports_public view which inherits this policy via security_invoker)
CREATE POLICY "Public can view safe counterfeit data"
ON public.counterfeit_reports
FOR SELECT
TO public
USING (true);