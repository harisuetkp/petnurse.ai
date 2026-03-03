import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { UserInbox } from "./UserInbox";
import { NewBlogNotification } from "./NewBlogNotification";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePageTracking } from "@/hooks/usePageTracking";

export function AppLayout() {
  const location = useLocation();
  const isAdminPage = location.pathname === "/admin";

  // Track page views for analytics
  usePageTracking();

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 30000,
    gcTime: 300000,
  });
  // Hide bottom nav on landing page (non-auth) — it shows its own nav
  const isLandingOrAuth = location.pathname === "/auth" || location.pathname === "/forgot-password" || location.pathname === "/reset-password";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NewBlogNotification />
      {/* Inbox Button - Fixed position for logged-in users (not on admin page) */}
      {session && !isAdminPage && (
        <div className="fixed right-4 z-50" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 4rem)' }}>
          <UserInbox />
        </div>
      )}
      <main className="flex-1 pb-[calc(var(--nav-height)+var(--safe-area-bottom)+1rem)]">
        <Outlet />
      </main>
      <BottomNav />
      {!isLandingOrAuth && <BottomNav />}
    </div>
  );
}