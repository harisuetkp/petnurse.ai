
-- Create the blog topic queue table
CREATE TABLE public.blog_topic_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  target_keyword TEXT NOT NULL,
  pet_type TEXT NOT NULL DEFAULT 'both',
  priority INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'queued',
  generated_post_id UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.blog_topic_queue ENABLE ROW LEVEL SECURITY;

-- Only admins can manage the topic queue
CREATE POLICY "Admins can manage topic queue"
  ON public.blog_topic_queue
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ));

-- Block anonymous access
CREATE POLICY "Block anonymous access to topic queue"
  ON public.blog_topic_queue
  FOR SELECT
  USING (false);

-- Add updated_at trigger
CREATE TRIGGER update_blog_topic_queue_updated_at
  BEFORE UPDATE ON public.blog_topic_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add constraint for valid status
ALTER TABLE public.blog_topic_queue
  ADD CONSTRAINT blog_topic_queue_status_check
  CHECK (status IN ('queued', 'drafted', 'published'));

-- Add constraint for valid pet_type
ALTER TABLE public.blog_topic_queue
  ADD CONSTRAINT blog_topic_queue_pet_type_check
  CHECK (pet_type IN ('dog', 'cat', 'both'));
