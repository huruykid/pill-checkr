-- Shared results must render for the person they were shared with.
--
-- Guest reports are inserted with shared = true (analyze-pill), so their
-- child rows already passed the old `user_id IS NULL AND shared` clause.
-- Account holders' reports set shared = true from the Results page, but the
-- old matches/test-strip policies still required user_id IS NULL, so an
-- anonymous viewer of such a link got the report row and zero matches: a
-- verdict page with no identification.
--
-- A child row is visible exactly when its parent report is visible under
-- "Anyone can view shared reports" USING (shared = true). Unshared account
-- reports remain owner-only. No new surface is exposed.

DROP POLICY IF EXISTS "Matches are readable with report access" ON public.matches;
CREATE POLICY "Matches are readable with report access"
  ON public.matches FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = matches.report_id
        AND (r.user_id = auth.uid() OR r.shared = true)
    )
  );

DROP POLICY IF EXISTS "Users can view own test strip results" ON public.test_strip_results;
CREATE POLICY "Users can view own test strip results"
  ON public.test_strip_results FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = test_strip_results.report_id
        AND (r.user_id = auth.uid() OR r.shared = true)
    )
  );
