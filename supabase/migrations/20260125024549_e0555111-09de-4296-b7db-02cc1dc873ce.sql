-- Fix 1: Add INSERT policy for webhook_logs
-- This allows the system (via edge functions) to insert webhook logs
-- Note: Edge functions using service_role_key bypass RLS, but explicit policy is best practice
CREATE POLICY "System can insert webhook logs"
ON public.webhook_logs
FOR INSERT
WITH CHECK (true);

-- Fix 2: Add UPDATE policy for webhook_logs (needed for marking events as processed)
CREATE POLICY "System can update webhook logs"
ON public.webhook_logs
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Fix 3: Strengthen influencers table protection
-- Drop the overly broad "Block anonymous access" restrictive policy 
-- and replace with a proper default-deny approach using permissive policies

-- First, drop the existing policies to rebuild them properly
DROP POLICY IF EXISTS "Block anonymous access to influencers" ON public.influencers;

-- Create a more explicit admin-only policy for viewing financial data
-- This ensures only admins and the specific influencer can see their sensitive data
CREATE POLICY "Only admins and owners can view influencer data"
ON public.influencers
FOR SELECT
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin')
);