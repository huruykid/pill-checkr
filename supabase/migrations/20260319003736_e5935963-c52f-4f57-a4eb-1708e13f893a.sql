-- Fix matches SELECT policy to require shared=true for anonymous reports
DROP POLICY "Matches are readable with report access" ON public.matches;

CREATE POLICY "Matches are readable with report access"
  ON public.matches FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM reports
      WHERE reports.id = matches.report_id
      AND (
        reports.user_id = auth.uid()
        OR (reports.user_id IS NULL AND reports.shared = true)
      )
    )
  );