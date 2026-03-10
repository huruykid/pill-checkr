DROP POLICY "Anyone can create reports" ON public.reports;

CREATE POLICY "Anyone can create reports"
ON public.reports FOR INSERT
TO public
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);