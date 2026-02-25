-- Create triage_overrides table for admin priority overrides
CREATE TABLE public.triage_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  triage_id UUID NOT NULL REFERENCES public.triage_history(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  original_priority TEXT NOT NULL,
  new_priority TEXT NOT NULL,
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_triage_overrides_triage_id ON public.triage_overrides(triage_id);
CREATE INDEX idx_triage_overrides_admin_id ON public.triage_overrides(admin_id);
CREATE INDEX idx_triage_overrides_created_at ON public.triage_overrides(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.triage_overrides ENABLE ROW LEVEL SECURITY;

-- Admins can view all overrides
CREATE POLICY "Admins can view all overrides"
  ON public.triage_overrides
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert overrides
CREATE POLICY "Admins can insert overrides"
  ON public.triage_overrides
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update overrides
CREATE POLICY "Admins can update overrides"
  ON public.triage_overrides
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete overrides
CREATE POLICY "Admins can delete overrides"
  ON public.triage_overrides
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can view overrides for their own triage records
CREATE POLICY "Users can view overrides for own triages"
  ON public.triage_overrides
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.triage_history th
      WHERE th.id = triage_overrides.triage_id
      AND th.user_id = auth.uid()
    )
  );

-- Block anonymous access
CREATE POLICY "Block anonymous access to triage_overrides"
  ON public.triage_overrides
  FOR SELECT
  USING (false);

-- Add realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.triage_overrides;