-- Create storage bucket for pet photos
INSERT INTO storage.buckets (id, name, public) VALUES ('pet-photos', 'pet-photos', true);

-- Create policy for pet photos - users can upload to their own folder
CREATE POLICY "Users can upload their pet photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pet-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy for pet photos - users can update their own photos
CREATE POLICY "Users can update their pet photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'pet-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy for pet photos - public read access
CREATE POLICY "Pet photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'pet-photos');

-- Create policy for pet photos - users can delete their own photos
CREATE POLICY "Users can delete their pet photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'pet-photos' AND auth.uid()::text = (storage.foldername(name))[1]);