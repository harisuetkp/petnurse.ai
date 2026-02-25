
-- 1. Ensure commissions_secure view inherits RLS from base commissions table
ALTER VIEW public.commissions_secure SET (security_invoker = on);

-- 2. Ensure influencers_secure view also inherits RLS
ALTER VIEW public.influencers_secure SET (security_invoker = on);
