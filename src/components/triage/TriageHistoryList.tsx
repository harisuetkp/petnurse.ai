import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, AlertTriangle, CheckCircle, ChevronRight, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SkeletonTriageHistory } from "@/components/ui/skeleton-card";
import { ErrorState } from "@/components/ui/error-state";

interface TriageOverride {
  id: string;
  triage_id: string;
  new_priority: string;
  admin_note: string | null;
}

interface TriageHistoryItem {
  id: string;
  symptoms: string;
  result_status: string;
  result_summary: string | null;
  created_at: string;
  pets?: {
    name: string;
    species: string;
  } | null;
}

const statusConfig = {
  red: {
    icon: AlertTriangle,
    label: "Emergency",
    className: "text-emergency-red bg-emergency-red/10",
  },
  yellow: {
    icon: Clock,
    label: "Urgent",
    className: "text-warning-amber bg-warning-amber/10",
  },
  green: {
    icon: CheckCircle,
    label: "Stable",
    className: "text-safe-green bg-safe-green/10",
  },
};

export function TriageHistoryList() {
  const queryClient = useQueryClient();
  
  // Fetch triage history
  const { data: history = [], isLoading, isError } = useQuery({
    queryKey: ["triage-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("triage_history")
        .select(`
          id,
          symptoms,
          result_status,
          result_summary,
          created_at,
          pets (name, species)
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as TriageHistoryItem[];
    },
    retry: 2,
  });

  // Fetch any overrides for the user's triages
  const triageIds = history.map((h) => h.id);
  const { data: overrides = [] } = useQuery({
    queryKey: ["triage-overrides-user", triageIds],
    queryFn: async () => {
      if (triageIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("triage_overrides")
        .select("id, triage_id, new_priority, admin_note")
        .in("triage_id", triageIds);

      if (error) throw error;
      return data as TriageOverride[];
    },
    enabled: triageIds.length > 0,
  });

  // Create a map for quick override lookup
  const overrideMap = new Map(overrides.map((o) => [o.triage_id, o]));

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ["triage-history"] });
  };

  if (isLoading) {
    return <SkeletonTriageHistory />;
  }

  if (isError) {
    return (
      <ErrorState
        variant="card"
        type="generic"
        title="Couldn't load history"
        message="We had trouble loading your triage history. Please try again."
        onRetry={handleRetry}
      />
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No triage history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((item) => {
        const override = overrideMap.get(item.id);
        const displayStatus = override ? override.new_priority : item.result_status;
        const config = statusConfig[displayStatus.toLowerCase() as keyof typeof statusConfig] || statusConfig.green;
        const Icon = config.icon;

        return (
          <div key={item.id} className="apple-card p-4 hover:shadow-apple-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className={cn("p-2.5 rounded-xl", config.className)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {item.pets && (
                    <span className="text-sm font-medium text-foreground">{item.pets.name}</span>
                  )}
                  {override && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/50 text-primary">
                      <Shield className="h-2.5 w-2.5 mr-0.5" />
                      Reviewed
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{item.symptoms}</p>
                {override?.admin_note && (
                  <p className="text-xs text-primary/80 mt-1 italic truncate">
                    Note: {override.admin_note}
                  </p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
