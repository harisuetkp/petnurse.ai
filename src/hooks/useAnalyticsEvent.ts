import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAnalyticsEvent() {
  const trackEvent = useCallback(async (eventName: string, eventData?: Record<string, unknown>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const visitorId = localStorage.getItem("visitor_id") || crypto.randomUUID();

      await supabase.from("analytics_events").insert([{
        user_id: session?.user?.id || null,
        visitor_id: visitorId,
        event_name: eventName,
        event_data: (eventData || {}) as any,
      }]);
    } catch (e) {
      console.warn("[Analytics] Failed to track event:", eventName, e);
    }
  }, []);

  return { trackEvent };
}
