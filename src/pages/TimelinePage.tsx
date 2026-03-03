import { useState } from "react";
import { TrendingUp, Calendar, Activity, Stethoscope, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageTransition } from "@/components/PageTransition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDailyCheckin } from "@/hooks/useDailyCheckin";
import { useActivePet } from "@/contexts/ActivePetContext";
import { useUpgradeTriggers } from "@/hooks/useUpgradeTriggers";
import { UpgradePrompt } from "@/components/triage/UpgradePrompt";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isSameMonth } from "date-fns";

interface TriageEntry {
  id: string;
  symptoms: string;
  result_status: string;
  result_summary: string | null;
  created_at: string;
}

type TimelineItem =
  | { type: "checkin"; date: string; data: any }
  | { type: "triage"; date: string; data: TriageEntry };

function TimelinePage() {
  const { activePet } = useActivePet();
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 30000,
  });
  const { shouldGateTimeline } = useUpgradeTriggers(session?.user?.id);

  const { recentCheckins } = useDailyCheckin(session?.user?.id, activePet?.id);

  const { data: triageEntries = [] } = useQuery({
    queryKey: ["triage-history-timeline", session?.user?.id, activePet?.id],
    queryFn: async () => {
      let query = supabase
        .from("triage_history")
        .select("id, symptoms, result_status, result_summary, created_at")
        .eq("user_id", session!.user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (activePet?.id) {
        query = query.eq("pet_id", activePet.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as TriageEntry[];
    },
    enabled: !!session?.user?.id,
    staleTime: 30000,
  });

  // Build last 7 days grid
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const checkin = recentCheckins.find((c: any) => c.checkin_date === dateStr);
    const dayTriages = triageEntries.filter((t) => format(new Date(t.created_at), "yyyy-MM-dd") === dateStr);
    return { date, dateStr, checkin, triageCount: dayTriages.length };
  });

  // Calendar month data
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  // Map checkins and triages to dates for calendar
  const checkinMap = new Map<string, any>();
  recentCheckins.forEach((c: any) => checkinMap.set(c.checkin_date, c));

  const triageMap = new Map<string, TriageEntry[]>();
  triageEntries.forEach((t) => {
    const key = format(new Date(t.created_at), "yyyy-MM-dd");
    triageMap.set(key, [...(triageMap.get(key) || []), t]);
  });

  // Unified timeline
  const timelineItems: TimelineItem[] = [
    ...recentCheckins.map((c: any) => ({
      type: "checkin" as const,
      date: c.checkin_date + "T12:00:00Z",
      data: c,
    })),
    ...triageEntries.map((t) => ({
      type: "triage" as const,
      date: t.created_at,
      data: t,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const statusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "red") return "bg-emergency-red/10 text-emergency-red border-emergency-red/20";
    if (s === "yellow") return "bg-warning-amber/10 text-warning-amber border-warning-amber/20";
    return "bg-safe-green/10 text-safe-green border-safe-green/20";
  };

  const today = new Date();

  return (
    <PageTransition className="min-h-screen pb-4">
      <PageHeader
        title={activePet ? `${activePet.name}'s Timeline` : "Health Timeline"}
        icon={<TrendingUp className="h-4 w-4 text-accent-foreground" />}
      />
      <div className="px-5 max-w-lg mx-auto space-y-6 mt-4">
        {/* Timeline gate for non-premium users with triage history */}
        {shouldGateTimeline && timelineItems.length > 3 && (
          <div className="space-y-4">
            <div className="apple-card p-5 relative overflow-hidden">
              <div className="blur-[3px] select-none pointer-events-none">
                <h3 className="text-sm font-semibold text-foreground mb-2">Full Timeline</h3>
                <p className="text-xs text-muted-foreground">Your complete health history and patterns</p>
              </div>
            </div>
            <UpgradePrompt trigger="timeline_access" userId={session?.user?.id} petName={activePet?.name} />
          </div>
        )}
        {/* Last 7 Days Overview */}
        <div className="apple-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Last 7 Days</h3>
          <div className="grid grid-cols-7 gap-2">
            {last7Days.map(({ date, checkin, triageCount }) => {
              const score = (checkin as any)?.health_score;
              const isToday = isSameDay(date, today);
              return (
                <div key={date.toISOString()} className="flex flex-col items-center gap-1.5">
                  <span className={`text-[10px] font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                    {format(date, "EEE")}
                  </span>
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold relative ${
                      score != null
                        ? score >= 80
                          ? "bg-safe-green/15 text-safe-green"
                          : score >= 50
                          ? "bg-warning-amber/15 text-warning-amber"
                          : "bg-emergency-red/15 text-emergency-red"
                        : "bg-muted text-muted-foreground"
                    } ${isToday ? "ring-2 ring-primary/30" : ""}`}
                  >
                    {score ?? "—"}
                    {triageCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary text-[8px] font-bold text-primary-foreground flex items-center justify-center">
                        {triageCount}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                    {format(date, "d")}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-safe-green/20" />
              <span className="text-[10px] text-muted-foreground">Good (80+)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-warning-amber/20" />
              <span className="text-[10px] text-muted-foreground">Fair (50-79)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emergency-red/20" />
              <span className="text-[10px] text-muted-foreground">Poor (&lt;50)</span>
            </div>
          </div>
        </div>

        {/* Monthly Calendar */}
        <div className="apple-card p-5">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-sm font-semibold text-foreground">{format(calendarMonth, "MMMM yyyy")}</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
              disabled={isSameMonth(calendarMonth, today)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for offset */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-9" />
            ))}

            {calendarDays.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const checkin = checkinMap.get(dateStr);
              const triages = triageMap.get(dateStr) || [];
              const score = checkin?.health_score;
              const isToday = isSameDay(day, today);
              const isFuture = day > today;
              const hasActivity = !!checkin || triages.length > 0;

              return (
                <div
                  key={dateStr}
                  className={`h-9 rounded-lg flex flex-col items-center justify-center relative text-[11px] ${
                    isFuture
                      ? "text-muted-foreground/40"
                      : isToday
                      ? "ring-1.5 ring-primary bg-primary/5 font-bold text-primary"
                      : hasActivity
                      ? score != null
                        ? score >= 80
                          ? "bg-safe-green/10 text-safe-green font-medium"
                          : score >= 50
                          ? "bg-warning-amber/10 text-warning-amber font-medium"
                          : "bg-emergency-red/10 text-emergency-red font-medium"
                        : "bg-primary/5 text-primary font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {format(day, "d")}
                  {/* Activity dots */}
                  {hasActivity && (
                    <div className="flex gap-0.5 absolute -bottom-0.5">
                      {checkin && <div className="w-1 h-1 rounded-full bg-safe-green" />}
                      {triages.length > 0 && <div className="w-1 h-1 rounded-full bg-primary" />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Calendar legend */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-safe-green" />
              <span className="text-[10px] text-muted-foreground">Check-in</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[10px] text-muted-foreground">Triage</span>
            </div>
          </div>
        </div>

        {/* Unified Timeline */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Activity History</h3>
          {timelineItems.length === 0 ? (
            <div className="apple-card p-8 text-center">
              <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No activity yet. Start a daily check-in or symptom check!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {timelineItems.map((item) => {
                if (item.type === "checkin") {
                  const checkin = item.data;
                  return (
                    <div key={`checkin-${checkin.id}`} className="apple-card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-safe-green/10 flex items-center justify-center">
                            <Activity className="h-3.5 w-3.5 text-safe-green" />
                          </div>
                          <span className="text-sm font-medium text-foreground">Daily Check-in</span>
                        </div>
                        <span className={`text-sm font-bold ${
                          checkin.health_score >= 80 ? "text-safe-green" :
                          checkin.health_score >= 50 ? "text-warning-amber" : "text-emergency-red"
                        }`}>
                          {checkin.health_score}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {format(new Date(checkin.checkin_date), "MMM d, yyyy")}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary" className="text-[10px] capitalize">{checkin.mood}</Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">{checkin.appetite} appetite</Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">{checkin.energy} energy</Badge>
                      </div>
                      {checkin.symptoms_noted?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {checkin.symptoms_noted.map((s: string) => (
                            <Badge key={s} variant="outline" className="text-[10px] text-warning-amber border-warning-amber/30">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {checkin.notes && (
                        <p className="text-xs text-muted-foreground mt-2">{checkin.notes}</p>
                      )}
                    </div>
                  );
                }

                const triage = item.data;
                return (
                  <div key={`triage-${triage.id}`} className="apple-card p-4 border-l-4 border-l-primary/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Stethoscope className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground">Symptom Check</span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] uppercase ${statusColor(triage.result_status)}`}>
                        {triage.result_status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {format(new Date(triage.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    <p className="text-xs text-foreground">{triage.symptoms}</p>
                    {triage.result_summary && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{triage.result_summary}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

export default TimelinePage;
