-- Fix: Replace overly permissive INSERT policy on referral_clicks
-- The current policy uses WITH CHECK (true) which triggers the linter warning
-- Since this is for anonymous click tracking, we need to allow inserts but in a more controlled way

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can insert clicks" ON public.referral_clicks;

-- Create a new INSERT policy that's more specific
-- We validate that the influencer_id must exist and be active
CREATE POLICY "Public can track clicks for active influencers"
ON public.referral_clicks
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.influencers 
    WHERE influencers.id = influencer_id 
    AND influencers.is_active = true
  )
);

-- Add DELETE policy restricted to admins only (prevents data loss)
CREATE POLICY "Only admins can delete clicks"
ON public.referral_clicks
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));