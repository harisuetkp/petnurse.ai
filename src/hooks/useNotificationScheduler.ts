/**
 * Value-based notification scheduling logic.
 * Returns the appropriate notification message based on user engagement day.
 * Max 1 notification per day. Tone: clinical, calm, professional.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ScheduledNotification {
  title: string;
  body: string;
  type: "engagement" | "insight" | "upgrade_soft" | "risk_alert";
}

// Day-based notification templates
function getEngagementNotification(dayNumber: number, petName?: string): ScheduledNotification | null {
  const name = petName || "your pet";

  // Day 1–3: Clinical engagement, no upgrade mention
  if (dayNumber <= 3) {
    const messages = [
      { title: "Daily Health Monitoring", body: `Daily health assessment available for ${name}. Record current symptoms, appetite, and activity level.` },
      { title: "Health Check Available", body: "Consistent daily monitoring improves early detection of symptom pattern changes." },
      { title: "Monitoring Reminder", body: `Maintain ${name}'s health record with today's assessment. Structured tracking supports better veterinary consultations.` },
    ];
    return { ...messages[dayNumber - 1], type: "engagement" };
  }

  // Day 4–6: Clinical insight messaging
  if (dayNumber <= 6) {
    const messages = [
      { title: "Monitoring Insight", body: "Structured symptom tracking enables earlier identification of health changes that may require veterinary attention." },
      { title: "Pattern Recognition", body: `Consistent data collection for ${name} supports trend analysis and more informed clinical discussions.` },
      { title: "Early Detection", body: "Regular health monitoring helps identify subtle changes before they escalate into urgent concerns." },
    ];
    return { ...messages[dayNumber - 4], type: "insight" };
  }

  // Day 7: Soft upgrade mention
  if (dayNumber === 7) {
    return {
      title: "Advanced Analysis Available",
      body: "Access full risk stratification, trend analysis, and structured clinical reports.",
      type: "upgrade_soft",
    };
  }

  // Day 8+: Rotate between engagement and insight (no daily upgrade push)
  const cycleDay = ((dayNumber - 8) % 5);
  if (cycleDay < 3) {
    return {
      title: "Daily Health Assessment",
      body: "Structured daily monitoring builds a comprehensive health profile for veterinary reference.",
      type: "engagement",
    };
  }
  return {
    title: "Clinical Insight",
    body: "Longitudinal health data supports more productive veterinary consultations and earlier intervention.",
    type: "insight",
  };
}

// High-risk alert (triggered separately, not on schedule)
export function getRiskAlertNotification(petName?: string): ScheduledNotification {
  const name = petName || "your pet";
  return {
    title: "Assessment Review Recommended",
    body: `Recent assessment for ${name} indicates findings that may warrant review. Access the full analysis for detailed guidance.`,
    type: "risk_alert",
  };
}

export function useNotificationScheduler(userId?: string, petName?: string) {
  // Calculate user's "day number" since first check-in
  const { data: firstCheckinDate } = useQuery({
    queryKey: ["first-checkin-date", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_checkins")
        .select("checkin_date")
        .eq("user_id", userId!)
        .order("checkin_date", { ascending: true })
        .limit(1);
      return data?.[0]?.checkin_date || null;
    },
    enabled: !!userId,
    staleTime: 86400000, // 24h cache
  });

  // Check if notification was already sent today
  const { data: lastNotificationDate } = useQuery({
    queryKey: ["last-notification-date", userId],
    queryFn: () => {
      const stored = localStorage.getItem(`pn_last_notif_${userId}`);
      return stored;
    },
    enabled: !!userId,
    staleTime: 60000,
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const alreadySentToday = lastNotificationDate === todayStr;

  const scheduledNotification = useMemo(() => {
    if (!firstCheckinDate || alreadySentToday) return null;

    const firstDate = new Date(firstCheckinDate + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayNumber = Math.floor((today.getTime() - firstDate.getTime()) / 86400000) + 1;

    return getEngagementNotification(Math.max(1, dayNumber), petName);
  }, [firstCheckinDate, alreadySentToday, petName]);

  const markNotificationSent = () => {
    if (userId) {
      localStorage.setItem(`pn_last_notif_${userId}`, todayStr);
    }
  };

  return {
    scheduledNotification,
    alreadySentToday,
    markNotificationSent,
    getRiskAlertNotification: () => getRiskAlertNotification(petName),
  };
}
