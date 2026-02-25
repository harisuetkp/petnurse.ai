-- Phase 1: Create admin function to get user emails from auth.users
-- This allows admins to view emails without storing them in profiles
CREATE OR REPLACE FUNCTION public.get_users_for_admin()
RETURNS TABLE (
  user_id uuid,
  email text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    au.id as user_id,
    au.email::text,
    au.created_at
  FROM auth.users au
  WHERE public.has_role(auth.uid(), 'admin')
$$;

-- Phase 1: Update handle_new_user trigger to not store email (data minimization)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Phase 1: Remove email column from profiles (after trigger update)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Phase 2: Add missing RLS policies for GDPR compliance

-- Allow users to delete their own profile
CREATE POLICY "Users can delete their own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Allow admins to delete any profile
CREATE POLICY "Admins can delete all profiles" 
ON public.profiles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::text));

-- Allow users to update their own triage records
CREATE POLICY "Users can update their own triage records" 
ON public.triage_history 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow users to delete their own triage records
CREATE POLICY "Users can delete their own triage records" 
ON public.triage_history 
FOR DELETE 
USING (auth.uid() = user_id);

-- Allow admins to manage triage history
CREATE POLICY "Admins can update all triage records" 
ON public.triage_history 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admins can delete all triage records" 
ON public.triage_history 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::text));