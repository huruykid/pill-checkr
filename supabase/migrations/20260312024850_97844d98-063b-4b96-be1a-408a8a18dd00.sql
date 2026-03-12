
-- Create community_submissions table
CREATE TABLE public.community_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  drug_name text NOT NULL,
  imprint text NOT NULL,
  shape public.pill_shape NOT NULL DEFAULT 'round',
  color public.pill_color NOT NULL DEFAULT 'white',
  photo_url text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  reviewer_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_submissions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own submissions
CREATE POLICY "Users can insert own submissions"
  ON public.community_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can view their own submissions
CREATE POLICY "Users can view own submissions"
  ON public.community_submissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions"
  ON public.community_submissions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update all submissions (approve/reject)
CREATE POLICY "Admins can update submissions"
  ON public.community_submissions
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
