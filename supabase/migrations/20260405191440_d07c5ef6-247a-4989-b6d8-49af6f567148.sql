
-- Create test_strip_results table
CREATE TABLE public.test_strip_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL DEFAULT 'fentanyl',
  result TEXT NOT NULL CHECK (result IN ('positive', 'negative', 'invalid')),
  strip_brand TEXT,
  user_id UUID,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.test_strip_results ENABLE ROW LEVEL SECURITY;

-- Insert: anyone can log a test result (matches reports insert policy pattern)
CREATE POLICY "Anyone can insert test strip results"
  ON public.test_strip_results
  FOR INSERT
  TO public
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
  );

-- Select: users can view test results for reports they own or shared reports
CREATE POLICY "Users can view own test strip results"
  ON public.test_strip_results
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = test_strip_results.report_id
        AND (r.user_id = auth.uid() OR (r.user_id IS NULL AND r.shared = true))
    )
  );

-- Update: users can update test results for their own reports
CREATE POLICY "Users can update own test strip results"
  ON public.test_strip_results
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = test_strip_results.report_id
        AND (r.user_id = auth.uid() OR (r.user_id IS NULL AND r.shared = true))
    )
  );

-- Index for fast lookups by report
CREATE INDEX idx_test_strip_results_report_id ON public.test_strip_results(report_id);
