import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Sparkles, Syringe, Activity, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  type: "triage" | "vaccination" | "checkin" | "medication";
  note?: string;
}

const typeConfig = {
  triage: { icon: Sparkles, label: "Check", color: "bg-primary text-primary-foreground" },
  vaccination: { icon: Syringe, label: "Vaccine", color: "bg-[hsl(var(--safe-green))] text-white" },
  checkin: { icon: Activity, label: "Check-in", color: "bg-[hsl(var(--primary-accent))] text-white" },
  medication: { icon: Activity, label: "Medication", color: "bg-[hsl(var(--warning-amber))] text-white" },
};

export function HealthTimeline({ userId, petId }: { userId?: string; petId?: string }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["health-timeline", userId, petId],
    queryFn: async () => {
      const result: TimelineEvent[] = [];

      let triageQuery = supabase
        .from("triage_history")
        .select("id, created_at, symptoms, result_status")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(5);
      if (petId) triageQuery = triageQuery.eq("pet_id", petId);
      const { data: triages } = await triageQuery;
      triages?.forEach((t) => {
        result.push({
          id: t.id,
          date: t.created_at,
          title: `Health Check: ${t.result_status.toUpperCase()}`,
          type: "triage",
          note: t.symptoms?.substring(0, 60),
        });
      });

      let reminderQuery = supabase
        .from("care_reminders")
        .select("id, completed_at, title, category")
        .eq("user_id", userId!)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(5);
      if (petId) reminderQuery = reminderQuery.eq("pet_id", petId);
      const { data: reminders } = await reminderQuery;
      reminders?.forEach((r) => {
        result.push({
          id: r.id,
          date: r.completed_at!,
          title: r.title,
          type: r.category === "vaccination" ? "vaccination" : "medication",
        });
      });

      let checkinQuery = supabase
        .from("daily_checkins")
        .select("id, created_at, mood, health_score")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(3);
      if (petId) checkinQuery = checkinQuery.eq("pet_id", petId);
      const { data: checkins } = await checkinQuery;
      checkins?.forEach((c) => {
        result.push({
          id: c.id,
          date: c.created_at,
          title: `Daily Check-in`,
          type: "checkin",
          note: c.health_score ? `Health score: ${c.health_score}/10` : `Mood: ${c.mood}`,
        });
      });

      return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    },
    enabled: !!userId,
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div>
        <h3 className="text-sm font-bold text-foreground mb-3 tracking-tight">Health Timeline</h3>
        <div className="space-y-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 py-3">
              <Skeleton className="w-10 h-10 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-bold text-foreground mb-3 tracking-tight">Health Timeline</h3>
        <div className="apple-card p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <Calendar className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No health events yet</p>
          <p className="text-xs text-muted-foreground mt-1">Start by running a symptom check or adding vaccines</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground tracking-tight">Health Timeline</h3>
        <Link to="/timeline">
          <Button variant="outline" size="sm" className="text-xs h-8 rounded-2xl gap-1 text-primary border-primary/20">
            View All <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      <div className="apple-card p-4 overflow-hidden">
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[19px] top-3 bottom-3 w-[2px] bg-border rounded-full" />

          <div className="space-y-0">
            {events.slice(0, 4).map((event, i) => {
              const config = typeConfig[event.type];
              const Icon = config.icon;
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="relative flex items-start gap-3 py-3"
                >
                  {/* Timeline dot */}
                  <div className={`w-10 h-10 rounded-2xl ${config.color} flex items-center justify-center shrink-0 z-10 shadow-sm`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-foreground truncate">{event.title}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${config.color} shrink-0`}>
                        {config.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {format(new Date(event.date), "MMM d, yyyy")}
                      {event.note && ` · ${event.note}`}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
