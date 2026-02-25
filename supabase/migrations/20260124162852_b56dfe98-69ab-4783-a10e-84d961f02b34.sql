-- Fix pet-photos storage bucket security
-- Make the bucket private (users need signed URLs)
UPDATE storage.buckets SET public = false WHERE id = 'pet-photos';

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Pet photos are publicly accessible" ON storage.objects;

-- Create owner-scoped policies for pet-photos bucket
-- Users can view their own pet photos (folder structure: {user_id}/{pet_id}.{ext})
CREATE POLICY "Users can view their own pet photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'pet-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Ensure upload policy exists (check if already there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload their own pet photos'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can upload their own pet photos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = ''pet-photos'' AND auth.uid()::text = (storage.foldername(name))[1])';
  END IF;
END $$;

-- Ensure update policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their own pet photos'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update their own pet photos"
    ON storage.objects FOR UPDATE
    USING (bucket_id = ''pet-photos'' AND auth.uid()::text = (storage.foldername(name))[1])';
  END IF;
END $$;

-- Ensure delete policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own pet photos'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete their own pet photos"
    ON storage.objects FOR DELETE
    USING (bucket_id = ''pet-photos'' AND auth.uid()::text = (storage.foldername(name))[1])';
  END IF;
END $$;