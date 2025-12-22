-- Drop the overly permissive "Anyone can create matches" policy
-- The edge function uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS anyway
DROP POLICY IF EXISTS "Anyone can create matches" ON public.matches;