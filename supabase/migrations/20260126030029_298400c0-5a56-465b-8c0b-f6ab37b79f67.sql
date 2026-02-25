-- Fix: The secure views don't have RLS - views inherit from base table RLS
-- But the scanner flagged them. Let's add explicit RLS enablement and policies on views
-- Note: Views with security_invoker=on use the caller's permissions, so base table RLS applies

-- However, the views themselves don't need separate RLS - they use the base table's RLS
-- The issue is that views cannot have RLS policies directly in PostgreSQL
-- The security_invoker=on setting means the view runs with the permissions of the user querying it

-- Let's drop and recreate the views with proper security, and update base table policies

-- First, let's ensure the base tables have proper restrictive policies
-- The influencers table: influencers can only see their own via the view
-- The commissions table: influencers can only see their own via the view

-- Drop existing permissive policies that might be causing issues
DROP POLICY IF EXISTS "Influencers can view own record via secure access" ON public.influencers;
DROP POLICY IF EXISTS "Influencers can view own commissions via secure access" ON public.commissions;

-- Create restrictive policies that only allow access through proper channels
CREATE POLICY "Influencers can view own record via secure access" 
ON public.influencers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Influencers can view own commissions via secure access" 
ON public.commissions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM influencers i 
    WHERE i.id = commissions.influencer_id 
    AND i.user_id = auth.uid()
  )
);

-- Make audit logs truly append-only by preventing UPDATE/DELETE for all including admins
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;

CREATE POLICY "Admins can insert audit logs" 
ON public.admin_audit_logs 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Explicitly block UPDATE on audit logs (no policy = no access)
-- DELETE is already blocked (no policy exists)