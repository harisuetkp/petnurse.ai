-- Enable pgvector extension for RAG
CREATE EXTENSION IF NOT EXISTS vector;

-- Create veterinary knowledge base table
CREATE TABLE public.veterinary_knowledge (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT,
  embedding vector(768),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for vector similarity search
CREATE INDEX ON public.veterinary_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable RLS (public read for knowledge base)
ALTER TABLE public.veterinary_knowledge ENABLE ROW LEVEL SECURITY;

-- Anyone can read veterinary knowledge
CREATE POLICY "Veterinary knowledge is publicly readable" 
ON public.veterinary_knowledge 
FOR SELECT 
USING (true);

-- Create function to search knowledge base
CREATE OR REPLACE FUNCTION public.search_veterinary_knowledge(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  category TEXT,
  content TEXT,
  source TEXT,
  similarity float
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vk.id,
    vk.title,
    vk.category,
    vk.content,
    vk.source,
    1 - (vk.embedding <=> query_embedding) as similarity
  FROM public.veterinary_knowledge vk
  WHERE 1 - (vk.embedding <=> query_embedding) > match_threshold
  ORDER BY vk.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;