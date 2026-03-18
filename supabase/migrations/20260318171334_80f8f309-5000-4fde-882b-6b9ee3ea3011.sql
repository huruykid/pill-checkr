
-- Drop the overly permissive SELECT policy for anonymous reports
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;

-- Recreate with proper restriction: anonymous reports only visible if shared=true
CREATE POLICY "Users can view their own reports"
ON public.reports
FOR SELECT
TO public
USING (
  (auth.uid() = user_id)
  OR (user_id IS NULL AND shared = true)
);
