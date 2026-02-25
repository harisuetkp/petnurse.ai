-- Add permanent influencer attribution to user profiles
-- This ensures influencers get their 10% on ALL future purchases, not just the first one

ALTER TABLE public.profiles 
ADD COLUMN referred_by_influencer_id UUID REFERENCES public.influencers(id) ON DELETE SET NULL;

-- Add index for efficient lookups when processing commissions
CREATE INDEX idx_profiles_referred_by_influencer ON public.profiles(referred_by_influencer_id) WHERE referred_by_influencer_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.profiles.referred_by_influencer_id IS 'Permanent influencer attribution - ensures lifetime commission tracking on all purchases';