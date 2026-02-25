-- Create extensions schema for better security hygiene
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage to authenticated and anon roles
GRANT USAGE ON SCHEMA extensions TO authenticated, anon;

-- Move vector extension to extensions schema
ALTER EXTENSION vector SET SCHEMA extensions;

-- Update search_veterinary_knowledge function to use the new schema path
CREATE OR REPLACE FUNCTION public.search_veterinary_knowledge(
  query_embedding extensions.vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  category text,
  content text,
  source text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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
  FROM veterinary_knowledge vk
  WHERE 1 - (vk.embedding <=> query_embedding) > match_threshold
  ORDER BY vk.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;