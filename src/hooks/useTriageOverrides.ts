import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "./useAuditLog";
import { useToast } from "./use-toast";

interface TriageOverride {
  id: string;
  triage_id: string;
  admin_id: string;
  original_priority: string;
  new_priority: string;
  admin_note: string | null;
  created_at: string;
}

interface CreateOverrideParams {
  triageId: string;
  originalPriority: string;
  newPriority: string;
  adminNote?: string;
}

export function useTriageOverrides() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all overrides (for admin view)
  const { data: overrides = [], isLoading } = useQuery({
    queryKey: ["triage-overrides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("triage_overrides")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as TriageOverride[];
    },
    staleTime: 30000,
    gcTime: 300000,
  });

  // Create a new override
  const createOverrideMutation = useMutation({
    mutationFn: async ({ triageId, originalPriority, newPriority, adminNote }: CreateOverrideParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("triage_overrides")
        .insert({
          triage_id: triageId,
          admin_id: user.id,
          original_priority: originalPriority,
          new_priority: newPriority,
          admin_note: adminNote || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["triage-overrides"] });
      
      await logAdminAction({
        actionType: "triage_priority_override",
        targetId: variables.triageId,
        previousValues: { priority: variables.originalPriority },
        newValues: { 
          priority: variables.newPriority,
          note: variables.adminNote,
        },
      });

      toast({
        title: "Override Applied",
        description: `Priority changed from ${variables.originalPriority.toUpperCase()} to ${variables.newPriority.toUpperCase()}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to apply override",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete an override
  const deleteOverrideMutation = useMutation({
    mutationFn: async (overrideId: string) => {
      const { error } = await supabase
        .from("triage_overrides")
        .delete()
        .eq("id", overrideId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["triage-overrides"] });
      toast({
        title: "Override Removed",
        description: "The triage result has been restored to its original priority.",
      });
    },
  });

  // Check if a specific triage has an override
  const getOverrideForTriage = (triageId: string): TriageOverride | undefined => {
    return overrides.find((o) => o.triage_id === triageId);
  };

  return {
    overrides,
    isLoading,
    createOverride: createOverrideMutation.mutate,
    deleteOverride: deleteOverrideMutation.mutate,
    getOverrideForTriage,
    isCreating: createOverrideMutation.isPending,
    isDeleting: deleteOverrideMutation.isPending,
  };
}

// Hook for user-side to check for override on their triage
export function useTriageOverrideCheck(triageId: string | undefined) {
  return useQuery({
    queryKey: ["triage-override", triageId],
    queryFn: async () => {
      if (!triageId) return null;
      
      const { data, error } = await supabase
        .from("triage_overrides")
        .select("*")
        .eq("triage_id", triageId)
        .maybeSingle();
      
      if (error) throw error;
      return data as TriageOverride | null;
    },
    enabled: !!triageId,
  });
}
