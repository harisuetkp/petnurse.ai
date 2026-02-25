
-- Fix: Create a public-safe view for customer reviews that excludes user_id
CREATE OR REPLACE VIEW public.customer_reviews_public 
WITH (security_invoker = on)
AS
SELECT id, display_name, rating, comment, pet_type, created_at, is_approved
FROM public.customer_reviews
WHERE is_approved = true;

GRANT SELECT ON public.customer_reviews_public TO anon, authenticated;
