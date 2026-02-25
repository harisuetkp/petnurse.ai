-- Fix: validate_promo_code exposes sensitive commission_rate data
-- Drop existing function first (return type is changing)
DROP FUNCTION IF EXISTS public.validate_promo_code(text);

-- Recreate without exposing commission_rate (internal business data)
-- Only return is_valid and influencer_id (for attribution)
CREATE FUNCTION public.validate_promo_code(code text)
RETURNS TABLE(influencer_id uuid, is_valid boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id as influencer_id,
    true as is_valid
  FROM public.influencers i
  WHERE UPPER(i.promo_code) = UPPER(code)
    AND i.is_active = true;
  
  -- If no rows returned, return invalid
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, false;
  END IF;
END;
$$;