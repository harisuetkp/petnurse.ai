
-- Fix validate_promo_code to not return commission_rate
CREATE OR REPLACE FUNCTION public.validate_promo_code(code text)
RETURNS TABLE(influencer_id uuid, is_valid boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
