CREATE TABLE public.buddy_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  contacts_notified jsonb NOT NULL DEFAULT '[]'::jsonb,
  message text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.buddy_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own alerts"
  ON public.buddy_alerts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own alerts"
  ON public.buddy_alerts FOR SELECT TO authenticated
  USING (user_id = auth.uid());