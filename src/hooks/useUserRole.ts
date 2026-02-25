import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export type UserRole = "admin" | "moderator" | "user" | "viewer";

export interface UserPermissions {
  canViewAdmin: boolean;
  canManageUsers: boolean;
  canEditRoles: boolean;
  canSendMessages: boolean;
  canTogglePremium: boolean;
  canViewAnalytics: boolean;
  canEditTriageRules: boolean;
  canImpersonate: boolean;
  isReadOnly: boolean;
}

const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  admin: {
    canViewAdmin: true,
    canManageUsers: true,
    canEditRoles: true,
    canSendMessages: true,
    canTogglePremium: true,
    canViewAnalytics: true,
    canEditTriageRules: true,
    canImpersonate: true,
    isReadOnly: false,
  },
  moderator: {
    canViewAdmin: true,
    canManageUsers: true,
    canEditRoles: false,
    canSendMessages: true,
    canTogglePremium: false,
    canViewAnalytics: true,
    canEditTriageRules: false,
    canImpersonate: true,
    isReadOnly: false,
  },
  viewer: {
    canViewAdmin: true,
    canManageUsers: false,
    canEditRoles: false,
    canSendMessages: false,
    canTogglePremium: false,
    canViewAnalytics: true,
    canEditTriageRules: false,
    canImpersonate: false,
    isReadOnly: true,
  },
  user: {
    canViewAdmin: false,
    canManageUsers: false,
    canEditRoles: false,
    canSendMessages: false,
    canTogglePremium: false,
    canViewAnalytics: false,
    canEditTriageRules: false,
    canImpersonate: false,
    isReadOnly: true,
  },
};

export function useUserRole() {
  const queryClient = useQueryClient();

  // Listen for auth state changes and invalidate queries
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        // Invalidate session and roles queries to force refetch
        queryClient.invalidateQueries({ queryKey: ["session"] });
        queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 30000,
    gcTime: 300000,
  });

  const { data: userRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["user-roles", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      if (error) throw error;
      return data.map((r) => r.role as UserRole);
    },
    enabled: !!session?.user?.id,
    staleTime: 60000,
    gcTime: 300000,
  });

  // Get the highest permission role
  const getHighestRole = (): UserRole => {
    if (userRoles.includes("admin")) return "admin";
    if (userRoles.includes("moderator")) return "moderator";
    if (userRoles.includes("viewer")) return "viewer";
    return "user";
  };

  const highestRole = getHighestRole();
  const permissions = ROLE_PERMISSIONS[highestRole];

  // Loading includes both session and roles loading
  const isLoading = sessionLoading || (!!session?.user?.id && rolesLoading);

  return {
    session,
    userRoles,
    highestRole,
    permissions,
    isLoading,
    isAdmin: userRoles.includes("admin"),
    isModerator: userRoles.includes("moderator"),
    isViewer: userRoles.includes("viewer"),
    hasAdminAccess: userRoles.some((r) => ["admin", "moderator", "viewer"].includes(r)),
  };
}
