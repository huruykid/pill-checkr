
CREATE TABLE public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  label text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  secret text,
  events text[] NOT NULL DEFAULT '{high_risk_analysis}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  status_code integer,
  response_body text,
  success boolean NOT NULL DEFAULT false,
  delivered_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own webhooks" ON public.webhooks
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own webhooks" ON public.webhooks
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own webhooks" ON public.webhooks
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own webhooks" ON public.webhooks
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can read own webhook deliveries" ON public.webhook_deliveries
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.webhooks w WHERE w.id = webhook_deliveries.webhook_id AND w.user_id = auth.uid()
  ));
