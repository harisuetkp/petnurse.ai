
-- Daily check-ins table
CREATE TABLE public.daily_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood TEXT NOT NULL CHECK (mood IN ('great', 'good', 'okay', 'poor', 'bad')),
  appetite TEXT NOT NULL CHECK (appetite IN ('normal', 'increased', 'decreased', 'none')),
  energy TEXT NOT NULL CHECK (energy IN ('high', 'normal', 'low', 'lethargic')),
  symptoms_noted TEXT[] DEFAULT '{}',
  notes TEXT,
  health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, pet_id, checkin_date)
);

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins" ON public.daily_checkins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own checkins" ON public.daily_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own checkins" ON public.daily_checkins FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own checkins" ON public.daily_checkins FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all checkins" ON public.daily_checkins FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Analytics events table
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  visitor_id TEXT,
  event_name TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics events" ON public.analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view analytics events" ON public.analytics_events FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Block anonymous read" ON public.analytics_events FOR SELECT USING (false);

-- Index for fast daily checkin queries
CREATE INDEX idx_daily_checkins_user_pet_date ON public.daily_checkins(user_id, pet_id, checkin_date DESC);
CREATE INDEX idx_analytics_events_name ON public.analytics_events(event_name, created_at DESC);
