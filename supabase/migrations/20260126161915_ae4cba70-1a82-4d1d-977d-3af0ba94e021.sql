-- Add name column to influencers table
ALTER TABLE public.influencers 
ADD COLUMN IF NOT EXISTS name text;

-- Update the influencers_secure view to include name
DROP VIEW IF EXISTS public.influencers_secure;
CREATE VIEW public.influencers_secure
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  promo_code,
  name,
  is_active,
  pending_balance,
  total_earned,
  created_at,
  updated_at
FROM public.influencers;

-- Note: commission_rate and stripe_connect_id are intentionally excluded for security