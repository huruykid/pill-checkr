
-- Emergency contacts for buddy alert system
CREATE TABLE public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own contacts"
  ON public.emergency_contacts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own contacts"
  ON public.emergency_contacts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own contacts"
  ON public.emergency_contacts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own contacts"
  ON public.emergency_contacts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Counterfeit reports table
CREATE TABLE public.counterfeit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
  city TEXT,
  state TEXT,
  risk_level TEXT,
  drug_name TEXT,
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.counterfeit_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit counterfeit reports"
  ON public.counterfeit_reports FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Counterfeit reports are publicly readable"
  ON public.counterfeit_reports FOR SELECT
  TO public
  USING (true);
