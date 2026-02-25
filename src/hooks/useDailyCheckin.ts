import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CheckinInput {
  petId: string;
  mood: "great" | "good" | "okay" | "poor" | "bad";
  appetite: "normal" | "increased" | "decreased" | "none";
  energy: "high" | "normal" | "low" | "lethargic";
  symptomsNoted?: string[];
  notes?: string;
}

const MOOD_SCORES: Record<string, number> = { great: 100, good: 80, okay: 60, poor: 35, bad: 10 };
const APPETITE_SCORES: Record<string, number> = { normal: 100, increased: 70, decreased: 40, none: 10 };
const ENERGY_SCORES: Record<string, number> = { high: 90, normal: 100, low: 50, lethargic: 15 };

function calculateHealthScore(mood: string, appetite: string, energy: string, symptoms: string[]): number {
  const base = (MOOD_SCORES[mood] * 0.4) + (APPETITE_SCORES[appetite] * 0.3) + (ENERGY_SCORES[energy] * 0.3);
  const symptomPenalty = Math.min(symptoms.length * 8, 30);
  return Math.max(0, Math.min(100, Math.round(base - symptomPenalty)));
}

export function useDailyCheckin(userId?: string, petId?: string) {
  const queryClient = useQueryClient();

  const todayCheckin = useQuery({
    queryKey: ["daily-checkin-today", userId, petId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("user_id", userId!)
        .eq("pet_id", petId!)
        .eq("checkin_date", today)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!petId,
    staleTime: 30000,
  });

  const recentCheckins = useQuery({
    queryKey: ["daily-checkins-recent", userId, petId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("user_id", userId!)
        .eq("pet_id", petId!)
        .order("checkin_date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!petId,
    staleTime: 30000,
  });

  const submitCheckin = useMutation({
    mutationFn: async (input: CheckinInput) => {
      const healthScore = calculateHealthScore(input.mood, input.appetite, input.energy, input.symptomsNoted || []);
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("daily_checkins")
        .upsert({
          user_id: userId!,
          pet_id: input.petId,
          checkin_date: today,
          mood: input.mood,
          appetite: input.appetite,
          energy: input.energy,
          symptoms_noted: input.symptomsNoted || [],
          notes: input.notes || null,
          health_score: healthScore,
        }, { onConflict: "user_id,pet_id,checkin_date" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-checkin-today"] });
      queryClient.invalidateQueries({ queryKey: ["daily-checkins-recent"] });
    },
  });

  const currentHealthScore = todayCheckin.data?.health_score ?? null;
  const streakDays = recentCheckins.data?.length ?? 0;

  return {
    todayCheckin: todayCheckin.data,
    recentCheckins: recentCheckins.data || [],
    currentHealthScore,
    streakDays,
    submitCheckin,
    isLoading: todayCheckin.isLoading,
  };
}
