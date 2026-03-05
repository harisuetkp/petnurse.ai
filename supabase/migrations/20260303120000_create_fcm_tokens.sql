-- Create FCM tokens table for push notification delivery
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'unknown' CHECK (platform IN ('ios', 'android', 'web', 'unknown')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Unique constraint on token to allow upsert
ALTER TABLE public.fcm_tokens ADD CONSTRAINT fcm_tokens_token_unique UNIQUE (token);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON public.fcm_tokens (user_id);

-- Enable RLS
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Users can insert their own tokens
CREATE POLICY "Users can insert their own FCM tokens"
  ON public.fcm_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tokens
CREATE POLICY "Users can update their own FCM tokens"
  ON public.fcm_tokens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own tokens
CREATE POLICY "Users can read their own FCM tokens"
  ON public.fcm_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own tokens
CREATE POLICY "Users can delete their own FCM tokens"
  ON public.fcm_tokens
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can read all tokens (for server-side push sending)
CREATE POLICY "Service role can read all FCM tokens"
  ON public.fcm_tokens
  FOR SELECT
  TO service_role
  USING (true);
