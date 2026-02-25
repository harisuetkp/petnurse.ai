
-- Add tags and scheduled publish support
ALTER TABLE public.blog_posts
  ADD COLUMN tags text[] DEFAULT '{}'::text[],
  ADD COLUMN scheduled_at timestamp with time zone;
