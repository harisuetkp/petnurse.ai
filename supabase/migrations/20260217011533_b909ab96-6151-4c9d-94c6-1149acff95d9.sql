
ALTER TABLE public.blog_posts 
ADD COLUMN review_status text NOT NULL DEFAULT 'draft';

-- Update existing posts: published ones get 'published', others stay 'draft'
UPDATE public.blog_posts SET review_status = 'published' WHERE published = true;
