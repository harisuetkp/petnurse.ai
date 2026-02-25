-- Fix: Restrict veterinary_knowledge table to authenticated users only
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Veterinary knowledge is publicly readable" ON public.veterinary_knowledge;

-- Create policy for authenticated users only
CREATE POLICY "Authenticated users can read veterinary knowledge"
ON public.veterinary_knowledge
FOR SELECT
TO authenticated
USING (true);

-- Defense-in-depth: explicitly block anonymous access
CREATE POLICY "Block anonymous access to veterinary_knowledge"
ON public.veterinary_knowledge
FOR SELECT
TO anon
USING (false);