
-- Create care_reminders table for vaccinations, medications, flea/tick, and vet appointments
CREATE TABLE public.care_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('vaccination', 'medication', 'flea_tick', 'vet_appointment')),
  title TEXT NOT NULL,
  notes TEXT,
  due_date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.care_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders" ON public.care_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own reminders" ON public.care_reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reminders" ON public.care_reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reminders" ON public.care_reminders FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all reminders" ON public.care_reminders FOR SELECT USING (has_role(auth.uid(), 'admin'::text));

CREATE TRIGGER update_care_reminders_updated_at
  BEFORE UPDATE ON public.care_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
