import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface TriageResult {
  status: "RED" | "YELLOW" | "GREEN";
  title: string;
  summary: string;
  next_steps: string[];
  warning_signs: string[];
}

interface SaveTriageParams {
  petId?: string | null;
  symptoms: string;
  result: TriageResult;
  conversation: Message[];
}

export function useTriageHistory() {
  const queryClient = useQueryClient();

  const saveTriageMutation = useMutation({
    mutationFn: async ({ petId, symptoms, result, conversation }: SaveTriageParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase.from("triage_history").insert({
        user_id: user.id,
        pet_id: petId || null,
        symptoms,
        result_status: result.status.toLowerCase(),
        result_summary: result.summary,
        next_steps: result.next_steps.join("\n"),
        conversation: conversation as unknown as Json,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["triage-history"] });
    },
    retry: 2,
    retryDelay: 1000,
  });

  return {
    saveTriage: saveTriageMutation.mutate,
    isSaving: saveTriageMutation.isPending,
  };
}
