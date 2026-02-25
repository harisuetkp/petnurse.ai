
-- Add SEO fields to blog_posts
ALTER TABLE public.blog_posts
  ADD COLUMN meta_title text,
  ADD COLUMN meta_description text,
  ADD COLUMN og_image_url text,
  ADD COLUMN faqs jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.blog_posts.faqs IS 'Array of {question, answer} objects for FAQ schema';
