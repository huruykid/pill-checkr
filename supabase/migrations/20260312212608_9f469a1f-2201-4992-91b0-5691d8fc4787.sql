
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  request_count bigint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  revoked_at timestamptz
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own api keys"
  ON public.api_keys FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own api keys"
  ON public.api_keys FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own api keys"
  ON public.api_keys FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
