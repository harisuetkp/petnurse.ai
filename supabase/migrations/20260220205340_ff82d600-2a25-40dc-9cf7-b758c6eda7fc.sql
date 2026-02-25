
-- Create a public blog-images storage bucket for AI-generated hero images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-images',
  'blog-images',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: Anyone can read (it's public)
CREATE POLICY "Public read blog images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');

-- RLS: Service role can insert (edge functions use service role)
CREATE POLICY "Service role can upload blog images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'blog-images');

-- RLS: Service role can update/delete
CREATE POLICY "Service role can update blog images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'blog-images');

CREATE POLICY "Service role can delete blog images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'blog-images');
