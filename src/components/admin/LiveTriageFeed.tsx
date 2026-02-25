import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Clock, Dog, Cat, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TriageEvent {
  id: string;
  symptoms: string;
  result_status: string;
  created_at: string;
  pet_species?: string;
  pet_name?: string;
}

interface LiveTriageFeedProps {
  initialData?: TriageEvent[];
}

const speciesIcons: Record<string, React.ElementType> = {
  dog: Dog,
  cat: Cat,
};

export function LiveTriageFeed({ initialData = [] }: LiveTriageFeedProps) {
  const [events, setEvents] = useState<TriageEvent[]>(initialData);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Set initial data
    if (initialData.length > 0) {
      setEvents(initialData.slice(0, 20));
    }

    // Subscribe to realtime updates
    const channel = supabase
      .channel("admin-triage-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "triage_history",
        },
        (payload) => {
          const newEvent = payload.new as TriageEvent;
          setEvents((prev) => [newEvent, ...prev].slice(0, 20));
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialData]);

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "red" || statusLower === "emergency") {
      return "border-l-red-500 bg-red-500/5";
    }
    if (statusLower === "yellow" || statusLower === "urgent") {
      return "border-l-amber-500 bg-amber-500/5";
    }
    return "border-l-emerald-500 bg-emerald-500/5";
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "red" || statusLower === "emergency") {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
          <AlertTriangle className="h-2.5 w-2.5 mr-1" />
          CRITICAL
        </Badge>
      );
    }
    if (statusLower === "yellow" || statusLower === "urgent") {
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
          URGENT
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
        STABLE
      </Badge>
    );
  };

  return (
    <div className="rounded-xl bg-[hsl(217,33%,17%)] border border-[hsl(217,33%,22%)] h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[hsl(217,33%,22%)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-white text-sm">Live Triage Feed</h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-2 w-2 rounded-full animate-pulse",
              isConnected ? "bg-emerald-400" : "bg-amber-400"
            )}
          />
          <span className="text-[10px] text-slate-400">
            {isConnected ? "Connected" : "Connecting..."}
          </span>
        </div>
      </div>

      {/* Feed */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {events.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No recent triage activity
            </div>
          ) : (
            events.map((event) => {
              const SpeciesIcon =
                speciesIcons[event.pet_species?.toLowerCase() || ""] || User;

              return (
                <div
                  key={event.id}
                  className={cn(
                    "p-3 rounded-lg border-l-2 transition-all hover:translate-x-1",
                    getStatusColor(event.result_status)
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <SpeciesIcon className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-xs text-slate-400">
                        {event.pet_name || "Unknown pet"}
                      </span>
                    </div>
                    {getStatusBadge(event.result_status)}
                  </div>
                  <p className="text-white text-sm line-clamp-2 mb-2">
                    {event.symptoms}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Clock className="h-2.5 w-2.5" />
                    {formatDistanceToNow(new Date(event.created_at), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
