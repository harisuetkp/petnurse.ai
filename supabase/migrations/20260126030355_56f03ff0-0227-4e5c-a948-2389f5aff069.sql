-- Fix conflicting RLS policies on influencers table
-- The issue is that restrictive policies ALL must pass, but we have two that conflict

-- Drop the conflicting admin-only restrictive policy
DROP POLICY IF EXISTS "Only admins can directly select from influencers" ON public.influencers;

-- Drop and recreate the influencer policy as permissive (so either admin OR owner can access)
DROP POLICY IF EXISTS "Influencers can view own record via secure access" ON public.influencers;

-- Create a single permissive policy that allows admins OR record owners
CREATE POLICY "Influencers can view own record"
ON public.influencers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Fix conflicting RLS policies on commissions table
DROP POLICY IF EXISTS "Only admins can directly select from commissions" ON public.commissions;
DROP POLICY IF EXISTS "Influencers can view own commissions via secure access" ON public.commissions;

-- Create a single permissive policy for commissions
CREATE POLICY "Users can view own commissions"
ON public.commissions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM influencers i 
    WHERE i.id = commissions.influencer_id 
    AND i.user_id = auth.uid()
  )
);

-- The referral_clicks INSERT policy returning false is intentional
-- It forces all click tracking through the edge function (service role)
-- This is a security feature to prevent client-side injection attacks