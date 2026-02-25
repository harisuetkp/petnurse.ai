-- Create page_views table for analytics tracking
CREATE TABLE public.page_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path TEXT NOT NULL,
  user_id UUID,
  visitor_id TEXT NOT NULL,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_page_views_created_at ON public.page_views(created_at DESC);
CREATE INDEX idx_page_views_path ON public.page_views(path);
CREATE INDEX idx_page_views_visitor_id ON public.page_views(visitor_id);

-- Enable RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for tracking anonymous visitors)
CREATE POLICY "Anyone can insert page views"
ON public.page_views
FOR INSERT
WITH CHECK (true);

-- Only admins can view analytics
CREATE POLICY "Admins can view all page views"
ON public.page_views
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Only admins can delete (for data cleanup)
CREATE POLICY "Admins can delete page views"
ON public.page_views
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Block anonymous SELECT access
CREATE POLICY "Block anonymous read access"
ON public.page_views
FOR SELECT
USING (false);