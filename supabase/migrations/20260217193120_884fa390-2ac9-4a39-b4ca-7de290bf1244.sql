-- Add faqs column to veterinary_knowledge for structured FAQ data on programmatic pages
ALTER TABLE public.veterinary_knowledge 
ADD COLUMN IF NOT EXISTS faqs jsonb DEFAULT '[]'::jsonb;