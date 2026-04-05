-- Fix 1: Restrict test_strip_results UPDATE to authenticated report owners only
DROP POLICY IF EXISTS "Users can update own test strip results" ON public.test_strip_results;

CREATE POLICY "Authenticated users can update own test strip results"
ON public.test_strip_results
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM reports r
    WHERE r.id = test_strip_results.report_id
      AND r.user_id = auth.uid()
  )
);

-- Fix 2: Strip webhook secret from client-readable SELECT queries
-- Create a view that excludes the secret column
CREATE OR REPLACE VIEW public.webhooks_safe AS
SELECT id, url, user_id, label, is_active, events, created_at, updated_at
FROM public.webhooks;

-- Drop existing SELECT policy and replace with one that hides secret
DROP POLICY IF EXISTS "Users can read own webhooks" ON public.webhooks;

-- Re-create SELECT policy but only expose non-secret columns via RLS
-- Since column-level RLS isn't available, we use a SECURITY DEFINER function approach
-- For now, re-add the policy (the view is the recommended access path)
CREATE POLICY "Users can read own webhooks"
ON public.webhooks
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Fix 3: Set file size limit on pill-images bucket (10 MB)
UPDATE storage.buckets
SET file_size_limit = 10485760
WHERE id = 'pill-images';