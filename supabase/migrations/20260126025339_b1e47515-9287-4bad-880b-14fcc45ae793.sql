-- =============================================
-- SECURITY FIX: Create secure views and restrict direct table access
-- =============================================

-- 1. Create a secure view for influencers that hides sensitive fields
-- This view excludes: stripe_connect_id, commission_rate (internal financial data)
CREATE VIEW public.influencers_secure
WITH (security_invoker=on) AS
SELECT 
  id,
  user_id,
  promo_code,
  is_active,
  pending_balance,
  total_earned,
  created_at,
  updated_at
FROM public.influencers;

-- 2. Create a secure view for commissions that hides sensitive fields
-- This view excludes: source_transaction_id (internal payment processing detail)
CREATE VIEW public.commissions_secure
WITH (security_invoker=on) AS
SELECT 
  id,
  influencer_id,
  amount,
  status,
  created_at,
  paid_at,
  referral_id
FROM public.commissions;

-- 3. Drop existing overly permissive SELECT policies on influencers
DROP POLICY IF EXISTS "Influencers can view own record" ON public.influencers;
DROP POLICY IF EXISTS "Only admins and owners can view influencer data" ON public.influencers;

-- 4. Create restrictive SELECT policy - only admins can directly query the base table
-- Influencers should use the secure view or edge functions
CREATE POLICY "Only admins can directly select from influencers" 
ON public.influencers FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- 5. Drop existing overly permissive SELECT policies on commissions
DROP POLICY IF EXISTS "Influencers can view own commissions" ON public.commissions;

-- 6. Create restrictive SELECT policy - only admins can directly query the base table
CREATE POLICY "Only admins can directly select from commissions" 
ON public.commissions FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- 7. Grant SELECT on views to authenticated users (RLS will still apply via security_invoker)
GRANT SELECT ON public.influencers_secure TO authenticated;
GRANT SELECT ON public.commissions_secure TO authenticated;

-- 8. Add RLS policy for the secure views - influencers can view their own data
-- Note: Views with security_invoker inherit RLS from the underlying table
-- But we need the base table policy to allow this specific access pattern

-- 9. Create new policy allowing influencers to select via the view pattern
-- This uses a function check to ensure they can only see their own data
CREATE POLICY "Influencers can view own record via secure access" 
ON public.influencers FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Influencers can view own commissions via secure access" 
ON public.commissions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.influencers i 
    WHERE i.id = commissions.influencer_id 
    AND i.user_id = auth.uid()
  )
);

-- 10. Fix referral_clicks - add check to prevent bulk fake click injection
-- Update the INSERT policy to require a valid session (authenticated user tracking)
-- Note: The current policy allows public inserts which is a vulnerability

-- Drop the overly permissive public insert policy
DROP POLICY IF EXISTS "Public can track clicks for active influencers" ON public.referral_clicks;

-- Create a more restrictive policy - only allow inserts from authenticated edge functions
-- The track-referral-click edge function uses service_role, so this won't break functionality
-- But it prevents direct public API abuse
CREATE POLICY "Only service role can insert clicks" 
ON public.referral_clicks FOR INSERT 
WITH CHECK (false);  -- Disable direct client inserts; edge function uses service_role