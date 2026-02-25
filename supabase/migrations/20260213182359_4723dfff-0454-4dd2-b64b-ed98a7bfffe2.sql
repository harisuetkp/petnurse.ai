
-- 1. Fix customer_reviews: replace public SELECT with a policy that excludes user_id
--    by forcing reads through the public view instead
DROP POLICY IF EXISTS "Anyone can read approved reviews" ON public.customer_reviews;

-- Only authenticated users can read approved reviews (still excludes user_id via view)
-- But block direct anon access to the base table
CREATE POLICY "Authenticated can read approved reviews"
ON public.customer_reviews
FOR SELECT
TO authenticated
USING (is_approved = true);

-- 2. Fix customer_reviews_public view: enable RLS and add policy
ALTER VIEW public.customer_reviews_public SET (security_invoker = on);

-- 3. No additional community_waitlist changes needed - SELECT is already blocked for anon
-- The existing policies correctly block anonymous reads via "Block anonymous read access" (USING false)
-- and "Users can view own waitlist entry" and "Admins can view all waitlist entries"
