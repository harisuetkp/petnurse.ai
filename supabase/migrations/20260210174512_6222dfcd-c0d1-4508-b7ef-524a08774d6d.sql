
-- Add input validation to validate_promo_code
CREATE OR REPLACE FUNCTION public.validate_promo_code(code text)
 RETURNS TABLE(influencer_id uuid, is_valid boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- Validate input: reject null, empty, too long, or invalid characters
  IF code IS NULL OR length(code) > 50 OR code !~ '^[A-Za-z0-9_-]+$' THEN
    RETURN QUERY SELECT NULL::UUID, false;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    i.id as influencer_id,
    true as is_valid
  FROM public.influencers i
  WHERE UPPER(i.promo_code) = UPPER(code)
    AND i.is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, false;
  END IF;
END;
$$;

-- Add input validation to get_influencer_stats
CREATE OR REPLACE FUNCTION public.get_influencer_stats(p_user_id uuid)
 RETURNS TABLE(total_clicks bigint, total_signups bigint, active_referrals bigint, conversion_rate numeric, pending_balance numeric, total_earned numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_influencer_id UUID;
BEGIN
  -- Validate input
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

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
