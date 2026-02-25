-- Add scan_credits and premium_until columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS scan_credits INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS premium_until TIMESTAMP WITH TIME ZONE;

-- Create webhook_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_id ON public.webhook_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON public.webhook_logs(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON public.webhook_logs(event_type);

-- Enable RLS on webhook_logs
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view webhook logs
CREATE POLICY "Admins can view webhook logs"
ON public.webhook_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert/update (for edge functions)
-- Note: Service role bypasses RLS, so no explicit policy needed for inserts

-- Add comment for documentation
COMMENT ON TABLE public.webhook_logs IS 'Audit log for Stripe webhook events with retry tracking';