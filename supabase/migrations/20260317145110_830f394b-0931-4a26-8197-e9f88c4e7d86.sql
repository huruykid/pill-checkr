
-- Table for "Was this match helpful?" feedback
CREATE TABLE public.match_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
  match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE,
  helpful boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  session_id text -- anonymous tracking via localStorage
);

ALTER TABLE public.match_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can submit feedback (anonymous)
CREATE POLICY "Anyone can insert match feedback"
  ON public.match_feedback FOR INSERT
  WITH CHECK (true);

-- Feedback is readable publicly for aggregation
CREATE POLICY "Match feedback is publicly readable"
  ON public.match_feedback FOR SELECT
  USING (true);
