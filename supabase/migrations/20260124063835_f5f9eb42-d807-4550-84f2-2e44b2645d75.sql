-- Drop the policies first that depend on is_admin column
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all triage history" ON public.triage_history;
DROP POLICY IF EXISTS "Admins can view all pets" ON public.pets;

-- Now drop the is_admin column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin;