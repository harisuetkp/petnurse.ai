
-- Community waitlist table
CREATE TABLE public.community_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email TEXT NOT NULL,
  premium_status BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (including anonymous for landing page)
CREATE POLICY "Anyone can join waitlist"
  ON public.community_waitlist FOR INSERT
  WITH CHECK (true);

-- Users can view their own entry
CREATE POLICY "Users can view own waitlist entry"
  ON public.community_waitlist FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all waitlist entries"
  ON public.community_waitlist FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Block anonymous reads
CREATE POLICY "Block anonymous read access"
  ON public.community_waitlist FOR SELECT
  USING (false);

-- Public count function (no auth needed)
CREATE OR REPLACE FUNCTION public.get_community_waitlist_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::INTEGER FROM public.community_waitlist;
$$;
