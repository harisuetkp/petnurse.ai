
-- 1. Tighten analytics_events: require visitor_id to prevent empty spam
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;
CREATE POLICY "Validated inserts only for analytics"
ON public.analytics_events
FOR INSERT
TO authenticated, anon
WITH CHECK (
  visitor_id IS NOT NULL AND length(visitor_id) >= 10 AND length(event_name) >= 2
);

-- 2. Tighten page_views: require visitor_id
DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;
CREATE POLICY "Validated inserts only for page views"
ON public.page_views
FOR INSERT
TO authenticated, anon
WITH CHECK (
  visitor_id IS NOT NULL AND length(visitor_id) >= 10 AND length(path) >= 1
);

-- 3. Tighten community_waitlist: require email format validation
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.community_waitlist;
CREATE POLICY "Validated waitlist signups"
ON public.community_waitlist
FOR INSERT
TO authenticated, anon
WITH CHECK (
  email IS NOT NULL AND email ~ '^[^@]+@[^@]+\.[^@]+$' AND length(email) <= 255
);

-- 4. Tighten pet_recommendations INSERT to admin-only (remove true check)
DROP POLICY IF EXISTS "Service role can insert recommendations" ON public.pet_recommendations;
CREATE POLICY "Service role inserts recommendations"
ON public.pet_recommendations
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));
