import { memo, useState, useEffect } from "react";
import { Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shows real assessment count from DB + simulated live activity.
 * Pulls total triage_history count and displays it as social proof.
 */
export const LiveActivityIndicator = memo(function LiveActivityIndicator() {
  // Pull real total assessment count via SECURITY DEFINER function (works for all users)
  const { data: totalAssessments } = useQuery({
    queryKey: ["total-assessments-count"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_total_assessment_count");
      if (error) return null;
      return data ?? 0;
    },
    staleTime: 120000,
  });

  // Simulated live "in progress" count
  const [liveCount, setLiveCount] = useState(() => Math.floor(Math.random() * 6) + 2);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount((prev) => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        return Math.max(2, Math.min(9, prev + delta));
      });
    }, 8000 + Math.random() * 7000);
    return () => clearInterval(interval);
  }, []);

  // Format total count for display (e.g., 5,000+)
  const formattedTotal = totalAssessments
    ? totalAssessments >= 1000
      ? `${Math.floor(totalAssessments / 1000).toLocaleString()},${String(totalAssessments % 1000).padStart(3, "0").slice(0, 3)}+`
      : `${totalAssessments}+`
    : "5,000+";

  return (
    <div className="flex items-center justify-center gap-4 py-2.5">
      {/* Live activity */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-safe-green opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-safe-green" />
        </div>
        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          <strong className="text-foreground">{liveCount}</strong> active now
        </span>
      </div>
      {/* Total count separator */}
      <span className="text-muted-foreground/40">·</span>
      <span className="text-xs text-muted-foreground">
        <strong className="text-foreground">{formattedTotal}</strong> assessments completed
      </span>
    </div>
  );
});
