import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CareReminder {
  id: string;
  user_id: string;
  pet_id: string | null;
  category: "vaccination" | "medication" | "flea_tick" | "vet_appointment";
  title: string;
  notes: string | null;
  due_date: string;
  completed_at: string | null;
  is_recurring: boolean;
  recurrence_days: number | null;
  created_at: string;
  updated_at: string;
}

interface CreateReminderInput {
  petId: string | null;
  category: CareReminder["category"];
  title: string;
  notes?: string;
  dueDate: string;
  isRecurring?: boolean;
  recurrenceDays?: number;
}

export function useCareReminders(userId?: string, petId?: string) {
  const queryClient = useQueryClient();

  const reminders = useQuery({
    queryKey: ["care-reminders", userId, petId],
    queryFn: async () => {
      let query = supabase
        .from("care_reminders")
        .select("*")
        .eq("user_id", userId!)
        .order("due_date", { ascending: true });

      if (petId) {
        query = query.eq("pet_id", petId);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as CareReminder[];
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  const upcomingReminders = (reminders.data || []).filter(
    (r) => !r.completed_at
  );

  const completedReminders = (reminders.data || []).filter(
    (r) => !!r.completed_at
  );

  const createReminder = useMutation({
    mutationFn: async (input: CreateReminderInput) => {
      const { data, error } = await supabase
        .from("care_reminders")
        .insert({
          user_id: userId!,
          pet_id: input.petId,
          category: input.category,
          title: input.title,
          notes: input.notes || null,
          due_date: input.dueDate,
          is_recurring: input.isRecurring || false,
          recurrence_days: input.recurrenceDays || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["care-reminders"] });
    },
  });

  const completeReminder = useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from("care_reminders")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", reminderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["care-reminders"] });
    },
  });

  const deleteReminder = useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from("care_reminders")
        .delete()
        .eq("id", reminderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["care-reminders"] });
    },
  });

  return {
    reminders: reminders.data || [],
    upcomingReminders,
    completedReminders,
    isLoading: reminders.isLoading,
    createReminder,
    completeReminder,
    deleteReminder,
  };
}
