-- Drop the existing overly permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can insert test strip results" ON public.test_strip_results;

-- Create a tighter INSERT policy that validates report ownership
CREATE POLICY "Users can insert test strip results for own reports"
ON public.test_strip_results FOR INSERT TO public
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.id = test_strip_results.report_id
      AND (r.user_id = auth.uid() OR r.user_id IS NULL)
  )
);