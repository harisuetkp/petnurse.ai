-- Fix the overly permissive webhook_logs policies
-- Drop the policies we just created and replace with admin-only policies

DROP POLICY IF EXISTS "System can insert webhook logs" ON public.webhook_logs;
DROP POLICY IF EXISTS "System can update webhook logs" ON public.webhook_logs;

-- Webhook edge functions use service_role_key which bypasses RLS
-- These policies are for any direct API access which should be admin-only
CREATE POLICY "Admins can insert webhook logs"
ON public.webhook_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update webhook logs"
ON public.webhook_logs
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));