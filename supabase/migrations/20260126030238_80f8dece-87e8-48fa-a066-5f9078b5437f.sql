-- Drop and recreate views with proper security_invoker setting
DROP VIEW IF EXISTS public.commissions_secure;
DROP VIEW IF EXISTS public.influencers_secure;

-- Recreate influencers_secure view with security_invoker
-- This masks sensitive fields like stripe_connect_id and commission_rate
CREATE VIEW public.influencers_secure
WITH (security_invoker = on) AS
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

-- Recreate commissions_secure view with security_invoker
-- This masks sensitive fields like source_transaction_id
CREATE VIEW public.commissions_secure
WITH (security_invoker = on) AS
SELECT 
    id,
    influencer_id,
    amount,
    status,
    created_at,
    paid_at,
    referral_id
FROM public.commissions;

-- Grant select on views to authenticated users (RLS on base tables will filter)
GRANT SELECT ON public.influencers_secure TO authenticated;
GRANT SELECT ON public.commissions_secure TO authenticated;