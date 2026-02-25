import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Generate or retrieve a persistent visitor ID
const getVisitorId = (): string => {
  const key = "pn_visitor_id";
  let visitorId = localStorage.getItem(key);
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(key, visitorId);
  }
  return visitorId;
};

export function usePageTracking() {
  const location = useLocation();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    const trackPageView = async () => {
      const currentPath = location.pathname;
      
      // Avoid duplicate tracking for same path
      if (lastTrackedPath.current === currentPath) {
        return;
      }
      lastTrackedPath.current = currentPath;

      // Skip admin pages from analytics
      if (currentPath.startsWith("/admin")) {
        return;
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id || null;
        const visitorId = getVisitorId();

        await supabase.from("page_views").insert({
          path: currentPath,
          user_id: userId,
          visitor_id: visitorId,
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
        });
      } catch (error) {
        // Silently fail - don't break the app for analytics
        console.debug("Page tracking error:", error);
      }
    };

    trackPageView();
  }, [location.pathname]);
}
