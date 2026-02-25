
-- Add constraints to page_views to limit abuse
ALTER TABLE public.page_views
  ADD CONSTRAINT page_views_path_length CHECK (length(path) <= 500),
  ADD CONSTRAINT page_views_visitor_id_format CHECK (visitor_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Add rate limiting trigger for page_views
CREATE OR REPLACE FUNCTION public.check_page_view_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.page_views
      WHERE visitor_id = NEW.visitor_id
      AND created_at > NOW() - INTERVAL '1 minute') > 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded for page views';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER page_views_rate_limit
  BEFORE INSERT ON public.page_views
  FOR EACH ROW
  EXECUTE FUNCTION public.check_page_view_rate_limit();
