
-- Table to store AI-generated weekly pet recommendations
CREATE TABLE public.pet_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pet_recommendations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own recommendations"
ON public.pet_recommendations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations"
ON public.pet_recommendations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recommendations"
ON public.pet_recommendations FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert recommendations"
ON public.pet_recommendations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all recommendations"
ON public.pet_recommendations FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Index for fast user lookups
CREATE INDEX idx_pet_recommendations_user_id ON public.pet_recommendations(user_id);
CREATE INDEX idx_pet_recommendations_pet_id ON public.pet_recommendations(pet_id);
