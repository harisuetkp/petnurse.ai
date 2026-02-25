-- =============================================
-- INFLUENCER ECOSYSTEM TABLES
-- =============================================

-- Influencers table
CREATE TABLE public.influencers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  promo_code TEXT NOT NULL UNIQUE,
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  total_earned NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  pending_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  stripe_connect_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  influencer_id UUID NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'churned')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  converted_at TIMESTAMP WITH TIME ZONE
);

-- Commissions table
CREATE TABLE public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  influencer_id UUID NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  source_transaction_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Referral clicks tracking
CREATE TABLE public.referral_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  influencer_id UUID NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_influencers_promo_code ON public.influencers(promo_code);
CREATE INDEX idx_influencers_user_id ON public.influencers(user_id);
CREATE INDEX idx_referrals_influencer_id ON public.referrals(influencer_id);
CREATE INDEX idx_referrals_referred_user_id ON public.referrals(referred_user_id);
CREATE INDEX idx_commissions_influencer_id ON public.commissions(influencer_id);
CREATE INDEX idx_commissions_status ON public.commissions(status);
CREATE INDEX idx_referral_clicks_influencer_id ON public.referral_clicks(influencer_id);

-- Enable RLS
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES: INFLUENCERS
-- =============================================

-- Influencers can view their own record
CREATE POLICY "Influencers can view own record"
  ON public.influencers FOR SELECT
  USING (auth.uid() = user_id);

-- Influencers can update their own record (limited fields handled in app)
CREATE POLICY "Influencers can update own record"
  ON public.influencers FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all influencers
CREATE POLICY "Admins can view all influencers"
  ON public.influencers FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Admins can manage all influencers
CREATE POLICY "Admins can insert influencers"
  ON public.influencers FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update influencers"
  ON public.influencers FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete influencers"
  ON public.influencers FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES: REFERRALS
-- =============================================

-- Influencers can view their referrals
CREATE POLICY "Influencers can view own referrals"
  ON public.referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.influencers
      WHERE id = influencer_id AND user_id = auth.uid()
    )
  );

-- Admins can view all referrals
CREATE POLICY "Admins can view all referrals"
  ON public.referrals FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Admins can manage referrals
CREATE POLICY "Admins can insert referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update referrals"
  ON public.referrals FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete referrals"
  ON public.referrals FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES: COMMISSIONS
-- =============================================

-- Influencers can view their commissions
CREATE POLICY "Influencers can view own commissions"
  ON public.commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.influencers
      WHERE id = influencer_id AND user_id = auth.uid()
    )
  );

-- Admins can view all commissions
CREATE POLICY "Admins can view all commissions"
  ON public.commissions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Admins can manage commissions
CREATE POLICY "Admins can insert commissions"
  ON public.commissions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update commissions"
  ON public.commissions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES: REFERRAL CLICKS
-- =============================================

-- Influencers can view their clicks
CREATE POLICY "Influencers can view own clicks"
  ON public.referral_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.influencers
      WHERE id = influencer_id AND user_id = auth.uid()
    )
  );

-- Admins can view all clicks
CREATE POLICY "Admins can view all clicks"
  ON public.referral_clicks FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Anyone can insert clicks (for tracking)
CREATE POLICY "Anyone can insert clicks"
  ON public.referral_clicks FOR INSERT
  WITH CHECK (true);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update timestamp trigger for influencers
CREATE TRIGGER update_influencers_updated_at
  BEFORE UPDATE ON public.influencers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to validate promo code (public, no auth required)
CREATE OR REPLACE FUNCTION public.validate_promo_code(code TEXT)
RETURNS TABLE (
  influencer_id UUID,
  commission_rate NUMERIC,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id as influencer_id,
    i.commission_rate,
    true as is_valid
  FROM public.influencers i
  WHERE UPPER(i.promo_code) = UPPER(code)
    AND i.is_active = true;
  
  -- If no rows returned, return invalid
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, 0::NUMERIC, false;
  END IF;
END;
$$;

-- Function to get influencer stats
CREATE OR REPLACE FUNCTION public.get_influencer_stats(p_user_id UUID)
RETURNS TABLE (
  total_clicks BIGINT,
  total_signups BIGINT,
  active_referrals BIGINT,
  conversion_rate NUMERIC,
  pending_balance NUMERIC,
  total_earned NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_influencer_id UUID;
BEGIN
  -- Get influencer ID
  SELECT id INTO v_influencer_id
  FROM public.influencers
  WHERE user_id = p_user_id;
  
  IF v_influencer_id IS NULL THEN
    RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.referral_clicks WHERE influencer_id = v_influencer_id)::BIGINT as total_clicks,
    (SELECT COUNT(*) FROM public.referrals WHERE influencer_id = v_influencer_id)::BIGINT as total_signups,
    (SELECT COUNT(*) FROM public.referrals WHERE influencer_id = v_influencer_id AND status = 'active')::BIGINT as active_referrals,
    CASE 
      WHEN (SELECT COUNT(*) FROM public.referral_clicks WHERE influencer_id = v_influencer_id) > 0 
      THEN ROUND(
        (SELECT COUNT(*) FROM public.referrals WHERE influencer_id = v_influencer_id)::NUMERIC / 
        (SELECT COUNT(*) FROM public.referral_clicks WHERE influencer_id = v_influencer_id)::NUMERIC * 100, 2
      )
      ELSE 0
    END as conversion_rate,
    i.pending_balance,
    i.total_earned
  FROM public.influencers i
  WHERE i.id = v_influencer_id;
END;
$$;