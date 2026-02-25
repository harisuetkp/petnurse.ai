import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, Activity, Heart, Brain, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";

interface HealthInsightsDashboardProps {
  userId: string;
  petId?: string;
  petName?: string;
}

export function HealthInsightsDashboard({ userId, petId, petName }: HealthInsightsDashboardProps) {
  const { t } = useLanguage();

  const { data: checkins = [] } = useQuery({
    queryKey: ["health-checkins-30d", userId, petId],
    queryFn: async () => {
      const since = subDays(new Date(), 30).toISOString();
      let query = supabase
        .from("daily_checkins")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", since)
        .order("checkin_date", { ascending: true });
      if (petId) query = query.eq("pet_id", petId);
      const { data } = await query;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 60000,
  });

  const { data: triages = [] } = useQuery({
    queryKey: ["health-triages-30d", userId, petId],
    queryFn: async () => {
      const since = subDays(new Date(), 30).toISOString();
      let query = supabase
        .from("triage_history")
        .select("id, result_status, symptoms, created_at")
        .eq("user_id", userId)
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      if (petId) query = query.eq("pet_id", petId);
      const { data } = await query;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 60000,
  });

  const chartData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const date = subDays(new Date(), 13 - i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayCheckins = checkins.filter((c) => c.checkin_date === dateStr);
      const avgScore = dayCheckins.length > 0
        ? Math.round(dayCheckins.reduce((sum, c) => sum + (c.health_score || 0), 0) / dayCheckins.length)
        : null;
      return {
        date: format(date, "MMM d"),
        score: avgScore,
        triages: triages.filter((t) => format(new Date(t.created_at), "yyyy-MM-dd") === dateStr).length,
      };
    });
  }, [checkins, triages]);

  const stats = useMemo(() => {
    const scores = checkins.filter((c) => c.health_score).map((c) => c.health_score!);
    const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const recentScores = scores.slice(-7);
    const olderScores = scores.slice(-14, -7);
    const recentAvg = recentScores.length > 0 ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : 0;
    const olderAvg = olderScores.length > 0 ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length : 0;
    const trend = recentAvg - olderAvg;
    const moodCounts: Record<string, number> = {};
    checkins.forEach((c) => { moodCounts[c.mood] = (moodCounts[c.mood] || 0) + 1; });
    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    const symptomCounts: Record<string, number> = {};
    checkins.forEach((c) => { c.symptoms_noted?.forEach((s: string) => { symptomCounts[s] = (symptomCounts[s] || 0) + 1; }); });
    const topSymptoms = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return { avg, trend, topMood, topSymptoms, totalCheckins: checkins.length, totalTriages: triages.length };
  }, [checkins, triages]);

  const TrendIcon = stats.trend > 2 ? TrendingUp : stats.trend < -2 ? TrendingDown : Minus;
  const trendColor = stats.trend > 2 ? "text-safe-green" : stats.trend < -2 ? "text-emergency-red" : "text-muted-foreground";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">
          {petName ? t("health.insightsFor", { name: petName }) : t("health.insights")}
        </h3>
        <Badge variant="secondary" className="text-xs">{t("health.last30days")}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="apple-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">{t("health.avgScore")}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{stats.avg ?? "—"}</span>
            <div className={`flex items-center gap-0.5 ${trendColor}`}>
              <TrendIcon className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{Math.abs(Math.round(stats.trend))}pts</span>
            </div>
          </div>
        </div>
        <div className="apple-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="h-4 w-4 text-safe-green" />
            <span className="text-xs text-muted-foreground">{t("health.topMood")}</span>
          </div>
          <span className="text-2xl font-bold text-foreground capitalize">
            {stats.topMood !== "—" ? t(`checkin.mood.${stats.topMood}`) : "—"}
          </span>
        </div>
        <div className="apple-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-warning-amber" />
            <span className="text-xs text-muted-foreground">{t("health.checkins")}</span>
          </div>
          <span className="text-2xl font-bold text-foreground">{stats.totalCheckins}</span>
        </div>
        <div className="apple-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">{t("health.aiAssessments")}</span>
          </div>
          <span className="text-2xl font-bold text-foreground">{stats.totalTriages}</span>
        </div>
      </div>

      {checkins.length > 1 && (
        <div className="apple-card p-4">
          <h4 className="text-sm font-medium text-foreground mb-3">{t("health.scoreTrend")}</h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontSize: 12 }} />
                <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#healthGradient)" strokeWidth={2} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {stats.topSymptoms.length > 0 && (
        <div className="apple-card p-4">
          <h4 className="text-sm font-medium text-foreground mb-3">{t("health.topSymptoms")}</h4>
          <div className="space-y-2">
            {stats.topSymptoms.map(([symptom, count]) => (
              <div key={symptom} className="flex items-center justify-between">
                <span className="text-sm text-foreground capitalize">{symptom.replace(/_/g, " ")}</span>
                <Badge variant="secondary" className="text-xs">{count}x</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {checkins.length === 0 && (
        <div className="apple-card p-8 text-center">
          <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("health.emptyState")}</p>
        </div>
      )}
    </div>
  );
}
