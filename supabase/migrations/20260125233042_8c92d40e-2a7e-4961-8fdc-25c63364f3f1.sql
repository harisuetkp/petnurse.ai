-- Add admin-only INSERT policy for veterinary_knowledge
CREATE POLICY "Only admins can insert veterinary knowledge"
ON public.veterinary_knowledge
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add admin-only UPDATE policy for veterinary_knowledge
CREATE POLICY "Only admins can update veterinary knowledge"
ON public.veterinary_knowledge
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Add admin-only DELETE policy for veterinary_knowledge
CREATE POLICY "Only admins can delete veterinary knowledge"
ON public.veterinary_knowledge
FOR DELETE
USING (has_role(auth.uid(), 'admin'));