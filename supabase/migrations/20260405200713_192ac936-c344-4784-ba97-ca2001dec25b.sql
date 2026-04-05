-- Fix SECURITY DEFINER view warning
DROP VIEW IF EXISTS public.webhooks_safe;

CREATE VIEW public.webhooks_safe
WITH (security_invoker = true)
AS
SELECT id, url, user_id, label, is_active, events, created_at, updated_at
FROM public.webhooks;