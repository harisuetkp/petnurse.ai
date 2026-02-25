import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Sends a welcome in-app message on the user's first login.
 * Uses localStorage to avoid duplicate calls across sessions.
 */
export function useWelcomeMessage(userId: string | undefined) {
  const sent = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || sent.current) return;

    const key = `welcome_sent_${userId}`;
    if (localStorage.getItem(key)) return;

    sent.current = true;

    const sendWelcome = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-welcome`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              "Content-Type": "application/json",
            },
          }
        );

        if (res.ok) {
          localStorage.setItem(key, "true");
          // Refresh inbox to show the new welcome message
          queryClient.invalidateQueries({ queryKey: ["user-messages"] });
        }
      } catch (e) {
        console.error("Welcome message error:", e);
      }
    };

    sendWelcome();
  }, [userId, queryClient]);
}
