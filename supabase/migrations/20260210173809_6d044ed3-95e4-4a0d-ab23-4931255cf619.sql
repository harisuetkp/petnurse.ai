
-- Enable RLS on the commissions_secure view
ALTER VIEW public.commissions_secure SET (security_invoker = on);

-- Enable RLS on the influencers_secure view
ALTER VIEW public.influencers_secure SET (security_invoker = on);
