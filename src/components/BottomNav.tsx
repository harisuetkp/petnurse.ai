import { NavLink, useLocation } from "react-router-dom";
import { Home, Sparkles, Heart, Users, User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";

export function BottomNav() {
  const location = useLocation();
  const { t } = useLanguage();

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 30000,
    gcTime: 300000,
  });

  const { data: isAdmin } = useQuery({
    queryKey: ["isAdmin", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
    enabled: !!session?.user?.id,
    staleTime: 60000,
    gcTime: 300000,
  });

  const baseNavItems = [
    { to: "/", icon: Home, labelKey: "nav.home" },
    { to: "/triage", icon: Sparkles, labelKey: "nav.healthCheck" },
    { to: "/care", icon: Heart, labelKey: "nav.care" },
    { to: "/community", icon: Users, labelKey: "nav.community" },
    { to: "/account", icon: User, labelKey: "nav.profile" },
  ];

  const navItems = isAdmin
    ? [...baseNavItems, { to: "/admin", icon: Shield, labelKey: "nav.admin" }]
    : baseNavItems;

  return (
    <nav className="bottom-nav z-50" aria-label="Main navigation" role="navigation">
      <div className="flex items-center justify-around h-[70px] max-w-lg mx-auto px-3">
        {navItems.map(({ to, icon: Icon, labelKey }) => {
          const isActive = location.pathname === to;
          const label = t(labelKey);
          return (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-2xl transition-all duration-200 active:scale-[0.96]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform",
                  isActive && "scale-105"
                )}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
