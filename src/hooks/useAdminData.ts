import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logAdminAction } from "@/hooks/useAuditLog";
import { subDays, startOfDay, isAfter } from "date-fns";
import { useMemo, useCallback } from "react";

interface Profile {
  id: string;
  user_id: string;
  is_premium: boolean;
  triage_count: number;
  created_at: string;
}

interface AdminUser {
  user_id: string;
  email: string | null;
  created_at: string;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  owner_id: string;
}

interface TriageRecord {
  id: string;
  user_id: string;
  symptoms: string;
  result_status: string;
  result_summary: string | null;
  created_at: string;
  pet_id: string | null;
}

interface Commission {
  id: string;
  influencer_id: string;
  amount: number;
  status: string;
  created_at: string;
}

export interface EnrichedUser {
  user_id: string;
  email: string | null;
  is_premium: boolean;
  triage_count: number;
  created_at: string;
  pets?: { id: string; name: string; species: string }[];
  lastTriage?: { result_status: string; created_at: string } | null;
}

// Optimized query config for large datasets
const QUERY_CONFIG = {
  staleTime: 30000, // 30 seconds - data stays fresh longer
  gcTime: 300000, // 5 minutes cache
  refetchOnWindowFocus: false, // Reduce refetches
};

export function useAdminData() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Session query
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    ...QUERY_CONFIG,
  });
  // Admin check
  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
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
    ...QUERY_CONFIG,
  });

  // Fetch all profiles with pagination-friendly approach
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000); // Limit for performance
      if (error) throw error;
      return data as Profile[];
    },
    enabled: isAdmin === true,
    ...QUERY_CONFIG,
  });

  // Fetch user emails - using RPC for efficiency
  const { data: adminUsers = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_users_for_admin");
      if (error) throw error;
      return data as AdminUser[];
    },
    enabled: isAdmin === true,
    ...QUERY_CONFIG,
  });

  // Fetch pets with limit
  const { data: allPets = [] } = useQuery({
    queryKey: ["admin-pets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pets")
        .select("id, name, species, owner_id")
        .limit(5000); // Limit for large datasets
      if (error) throw error;
      return data as Pet[];
    },
    enabled: isAdmin === true,
    ...QUERY_CONFIG,
  });

  // Fetch triage history with limit
  const { data: triageHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["admin-triage-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("triage_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as TriageRecord[];
    },
    enabled: isAdmin === true,
    ...QUERY_CONFIG,
  });

  // Fetch commissions for revenue analytics
  const { data: commissions = [] } = useQuery({
    queryKey: ["admin-commissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commissions")
        .select("id, influencer_id, amount, status, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as Commission[];
    },
    enabled: isAdmin === true,
    ...QUERY_CONFIG,
  });

  // Toggle premium mutation
  const togglePremiumMutation = useMutation({
    mutationFn: async ({ userId, isPremium }: { userId: string; isPremium: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_premium: isPremium })
        .eq("user_id", userId);
      if (error) throw error;
      
      // Log the action
      await logAdminAction({
        actionType: "premium_toggle",
        targetId: userId,
        previousValues: { is_premium: !isPremium },
        newValues: { is_premium: isPremium },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast({ title: "Updated!", description: "Premium status updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update premium status.", variant: "destructive" });
    },
  });

  // Create enriched user data with memoization for performance
  const enrichedUsers: EnrichedUser[] = useMemo(() => {
    // Build lookup maps for O(1) access instead of O(n) searches
    const emailMap = new Map(adminUsers.map(u => [u.user_id, u.email]));
    const petsByOwner = new Map<string, { id: string; name: string; species: string }[]>();
    
    for (const pet of allPets) {
      if (!petsByOwner.has(pet.owner_id)) {
        petsByOwner.set(pet.owner_id, []);
      }
      petsByOwner.get(pet.owner_id)!.push({ id: pet.id, name: pet.name, species: pet.species });
    }
    
    const triageByUser = new Map<string, { result_status: string; created_at: string }>();
    for (const t of triageHistory) {
      if (!triageByUser.has(t.user_id)) {
        triageByUser.set(t.user_id, { result_status: t.result_status, created_at: t.created_at });
      }
    }

    return profiles.map((profile) => ({
      user_id: profile.user_id,
      email: emailMap.get(profile.user_id) || null,
      is_premium: profile.is_premium,
      triage_count: profile.triage_count,
      created_at: profile.created_at,
      pets: petsByOwner.get(profile.user_id) || [],
      lastTriage: triageByUser.get(profile.user_id) || null,
    }));
  }, [profiles, adminUsers, allPets, triageHistory]);

  // Calculate stats
  const today = startOfDay(new Date());
  const weekAgo = subDays(today, 7);
  const monthAgo = subDays(today, 30);
  const previousMonth = subDays(today, 60);

  // Calculate estimated revenue based on premium users
  // $9.99/mo subscription, $5.99 one-time (estimated 20% of premium users)
  // Memoize stats calculation for performance
  const stats = useMemo(() => {
    const SUBSCRIPTION_PRICE = 9.99;
    const ONE_TIME_PRICE = 5.99;
    
    const premiumProfiles = profiles.filter((p) => p.is_premium);
    const currentMonthPremium = premiumProfiles.filter(
      (p) => isAfter(new Date(p.created_at), monthAgo)
    ).length;
    
    const previousMonthPremium = profiles.filter(
      (p) => p.is_premium && 
      isAfter(new Date(p.created_at), previousMonth) && 
      !isAfter(new Date(p.created_at), monthAgo)
    ).length;
    
    const estimatedSubscribers = Math.floor(premiumProfiles.length * 0.8);
    const estimatedOneTime = premiumProfiles.length - estimatedSubscribers;
    const estimatedMonthlyRevenue = (estimatedSubscribers * SUBSCRIPTION_PRICE) + (estimatedOneTime * ONE_TIME_PRICE);
    
    const revenueChange = previousMonthPremium === 0 
      ? (currentMonthPremium > 0 ? 100 : 0)
      : Math.round(((currentMonthPremium - previousMonthPremium) / previousMonthPremium) * 100);

    const now = new Date();
    const yesterday = subDays(now, 1);

    return {
      totalUsers: profiles.length,
      premiumUsers: premiumProfiles.length,
      activeTriages24h: triageHistory.filter((t) =>
        isAfter(new Date(t.created_at), yesterday)
      ).length,
      criticalAlerts: triageHistory.filter(
        (t) =>
          isAfter(new Date(t.created_at), today) &&
          (t.result_status.toLowerCase() === "red" || t.result_status.toLowerCase() === "emergency")
      ).length,
      estimatedMonthlyRevenue,
      revenueChange,
      subscriberGrowth: (() => {
        const currentWeekSubs = premiumProfiles.filter(
          (p) => isAfter(new Date(p.created_at), weekAgo)
        ).length;
        const previousWeekSubs = profiles.filter(
          (p) =>
            p.is_premium &&
            isAfter(new Date(p.created_at), subDays(weekAgo, 7)) &&
            !isAfter(new Date(p.created_at), weekAgo)
        ).length;
        if (previousWeekSubs === 0) return currentWeekSubs > 0 ? 100 : 0;
        return Math.round(((currentWeekSubs - previousWeekSubs) / previousWeekSubs) * 100);
      })(),
    };
  }, [profiles, triageHistory, today, weekAgo, monthAgo, previousMonth]);

  // Memoize sparkline data
  const sparklineData = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const day = subDays(new Date(), 6 - i);
      const dayStart = startOfDay(day);
      const dayEnd = startOfDay(subDays(day, -1));
      return triageHistory.filter(
        (t) =>
          isAfter(new Date(t.created_at), dayStart) && !isAfter(new Date(t.created_at), dayEnd)
      ).length;
    });
  }, [triageHistory]);

  return {
    session,
    isAdmin,
    checkingAdmin,
    enrichedUsers,
    profiles,
    triageHistory,
    commissions,
    stats,
    sparklineData,
    loadingProfiles,
    loadingHistory,
    togglePremium: togglePremiumMutation.mutate,
  };
}
