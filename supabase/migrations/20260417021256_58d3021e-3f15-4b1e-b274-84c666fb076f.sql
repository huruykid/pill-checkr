-- 1) Harden user_roles: explicit restrictive policies + revoke grants from anon/authenticated for write ops
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;

CREATE POLICY "Deny all client INSERT on user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Deny all client UPDATE on user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO anon, authenticated
USING (false);

CREATE POLICY "Deny all client DELETE on user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO anon, authenticated
USING (false);

-- 2) Harden webhooks.secret: revoke direct column SELECT on secret from clients.
-- Clients should use webhooks_safe view; edge functions use service_role.
REVOKE SELECT ON public.webhooks FROM anon, authenticated;
GRANT SELECT (id, user_id, label, url, events, is_active, created_at, updated_at)
  ON public.webhooks TO authenticated;
-- Insert/Update still go through RLS; ensure grants exist
GRANT INSERT, UPDATE, DELETE ON public.webhooks TO authenticated;

-- 3) match_feedback: prevent session spoofing by nullifying client-provided session_id
-- and enforce report_id existence via trigger.
CREATE OR REPLACE FUNCTION public.sanitize_match_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Never trust client-provided session_id for anonymous inserts
  IF auth.uid() IS NULL THEN
    NEW.session_id := NULL;
  END IF;

  -- Ensure report exists
  IF NOT EXISTS (SELECT 1 FROM public.reports r WHERE r.id = NEW.report_id) THEN
    RAISE EXCEPTION 'Invalid report_id';
  END IF;

  -- If match_id provided, must belong to the report
  IF NEW.match_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = NEW.match_id AND m.report_id = NEW.report_id
  ) THEN
    RAISE EXCEPTION 'match_id does not belong to report_id';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sanitize_match_feedback_trigger ON public.match_feedback;
CREATE TRIGGER sanitize_match_feedback_trigger
BEFORE INSERT ON public.match_feedback
FOR EACH ROW EXECUTE FUNCTION public.sanitize_match_feedback();