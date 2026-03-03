CREATE OR REPLACE FUNCTION public.get_total_assessment_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::INTEGER FROM public.triage_history;
$$;