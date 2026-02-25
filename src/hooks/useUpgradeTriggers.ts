/**
 * Central upgrade trigger logic for event-based premium prompts.
 * Tracks usage limits, streak gating, and contextual upgrade moments.
 */

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UpgradeTrigger =
  | "usage_limit"
  | "risk_detection"
  | "second_pet"
  | "timeline_access"
  | "checkin_streak"
  | null;

export interface UpgradeTriggerMessages {
  title: string;
  message: string;
  cta: string;
}

const TRIGGER_MESSAGES: Record<Exclude<UpgradeTrigger, null>, UpgradeTriggerMessages> = {
  usage_limit: {
    title: "Free Assessment Limit Reached",
    message: "You've completed your complimentary triage assessment. Access full structured analysis, risk stratification, and monitoring recommendations.",
    cta: "Access Full Triage Analysis",
  },
  risk_detection: {
    title: "Elevated Risk Indicators Detected",
    message: "Symptom pattern analysis indicates findings that warrant closer review. Access the complete clinical assessment for detailed next steps.",
    cta: "View Complete Assessment",
  },
  second_pet: {
    title: "Multi-Patient Monitoring",
    message: "Full access enables structured health monitoring across multiple pets with individualized triage records.",
    cta: "Enable Multi-Pet Monitoring",
  },
  timeline_access: {
    title: "Longitudinal Health Data",
    message: "Access historical symptom patterns and trend analysis to identify changes over time. Share comprehensive records with your veterinarian.",
    cta: "Access Health Timeline",
  },
  checkin_streak: {
    title: "Consistent Monitoring Achievement",
    message: "Seven consecutive days of health monitoring recorded. Continue with full access to advanced trend analysis and structured reports.",
    cta: "Continue Full Monitoring",
  },
};

export function useUpgradeTriggers(userId?: string) {
  // Get profile data for premium status and triage count
  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_premium, triage_count, scan_credits")
        .eq("user_id", userId!)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  // Get pet count
  const { data: petCount } = useQuery({
    queryKey: ["pet-count", userId],
    queryFn: async () => {
      const { count } = await supabase
        .from("pets")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", userId!);
      return count ?? 0;
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  // Get consecutive checkin streak
  const { data: checkinStreak } = useQuery({
    queryKey: ["checkin-streak", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_checkins")
        .select("checkin_date")
        .eq("user_id", userId!)
        .order("checkin_date", { ascending: false })
        .limit(10);

      if (!data || data.length === 0) return 0;

      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < data.length; i++) {
        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - i);
        const checkinDate = new Date(data[i].checkin_date + "T00:00:00");

        if (checkinDate.getTime() === expectedDate.getTime()) {
          streak++;
        } else {
          break;
        }
      }
      return streak;
    },
    enabled: !!userId,
    staleTime: 60000,
  });

  const isPremium = profile?.is_premium ?? false;
  const triageCount = profile?.triage_count ?? 0;

  // Check if usage limit is hit (free users get 1-2 assessments)
  const hasHitUsageLimit = !isPremium && triageCount >= 2;

  // Check if trying to add a second pet without premium
  const isSecondPetBlocked = !isPremium && (petCount ?? 0) >= 1;

  // Check if 7-day streak without premium
  const hasCompletedStreakGate = !isPremium && (checkinStreak ?? 0) >= 7;

  // Determine active trigger for timeline access
  const shouldGateTimeline = !isPremium && triageCount > 0;

  const getTriggerMessage = useCallback((trigger: Exclude<UpgradeTrigger, null>): UpgradeTriggerMessages => {
    return TRIGGER_MESSAGES[trigger];
  }, []);

  return useMemo(() => ({
    isPremium,
    triageCount,
    hasHitUsageLimit,
    isSecondPetBlocked,
    hasCompletedStreakGate,
    shouldGateTimeline,
    checkinStreak: checkinStreak ?? 0,
    getTriggerMessage,
  }), [isPremium, triageCount, hasHitUsageLimit, isSecondPetBlocked, hasCompletedStreakGate, shouldGateTimeline, checkinStreak, getTriggerMessage]);
}
