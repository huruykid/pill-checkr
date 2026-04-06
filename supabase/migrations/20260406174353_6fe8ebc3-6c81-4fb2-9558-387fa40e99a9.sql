-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Match feedback is publicly readable" ON public.match_feedback;

-- Only admins need to read raw feedback rows; the get_feedback_stats function is SECURITY DEFINER
CREATE POLICY "Admins can read match feedback"
ON public.match_feedback
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));