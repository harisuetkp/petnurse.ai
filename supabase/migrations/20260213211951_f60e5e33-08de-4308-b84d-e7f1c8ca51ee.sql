
-- Fix community_waitlist: require authenticated users for inserts
DROP POLICY IF EXISTS "Validated waitlist signups" ON public.community_waitlist;

CREATE POLICY "Validated waitlist signups"
ON public.community_waitlist
FOR INSERT
TO authenticated
WITH CHECK (
  (email IS NOT NULL)
  AND (email ~ '^[^@]+@[^@]+\.[^@]+$'::text)
  AND (length(email) <= 255)
  AND (auth.uid() IS NOT NULL)
);
