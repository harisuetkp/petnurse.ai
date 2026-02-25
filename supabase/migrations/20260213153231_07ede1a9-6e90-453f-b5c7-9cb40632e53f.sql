-- Allow admins to delete and update waitlist entries
CREATE POLICY "Admins can delete waitlist entries"
ON public.community_waitlist
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update waitlist entries"
ON public.community_waitlist
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));