-- Add default-deny policies for anonymous access on all sensitive tables
-- These policies ensure unauthenticated users cannot access any data

-- commissions - block anonymous SELECT
CREATE POLICY "Block anonymous access to commissions"
ON public.commissions
FOR SELECT
TO anon
USING (false);

-- influencers - block anonymous SELECT  
CREATE POLICY "Block anonymous access to influencers"
ON public.influencers
FOR SELECT
TO anon
USING (false);

-- referrals - block anonymous SELECT
CREATE POLICY "Block anonymous access to referrals"
ON public.referrals
FOR SELECT
TO anon
USING (false);

-- profiles - block anonymous SELECT
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- user_roles - block anonymous SELECT
CREATE POLICY "Block anonymous access to user_roles"
ON public.user_roles
FOR SELECT
TO anon
USING (false);

-- triage_history - block anonymous SELECT
CREATE POLICY "Block anonymous access to triage_history"
ON public.triage_history
FOR SELECT
TO anon
USING (false);

-- pets - block anonymous SELECT
CREATE POLICY "Block anonymous access to pets"
ON public.pets
FOR SELECT
TO anon
USING (false);

-- admin_messages - block anonymous SELECT
CREATE POLICY "Block anonymous access to admin_messages"
ON public.admin_messages
FOR SELECT
TO anon
USING (false);

-- referral_clicks - block anonymous SELECT (public can still INSERT for tracking)
CREATE POLICY "Block anonymous read access to referral_clicks"
ON public.referral_clicks
FOR SELECT
TO anon
USING (false);

-- webhook_logs - block anonymous SELECT
CREATE POLICY "Block anonymous access to webhook_logs"
ON public.webhook_logs
FOR SELECT
TO anon
USING (false);