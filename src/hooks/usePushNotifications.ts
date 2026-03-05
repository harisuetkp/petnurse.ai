import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { isNative } from "@/lib/platform";
import { supabase } from "@/integrations/supabase/client";

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | "unsupported";
  isEnabled: boolean;
  fcmToken: string | null;
}

/**
 * Save (upsert) the FCM token to the `fcm_tokens` table in Supabase.
 * Associates it with the currently logged-in user and their platform.
 */
async function saveFcmTokenToSupabase(token: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.log("ℹ️ No authenticated user — skipping FCM token save");
      return;
    }

    const platform = isNative()
      ? (navigator.userAgent.includes("Android") ? "android" : "ios")
      : "web";

    const { error } = await supabase
      .from("fcm_tokens")
      .upsert(
        {
          user_id: session.user.id,
          token,
          platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "token" }
      );

    if (error) {
      console.error("❌ Failed to save FCM token:", error);
    } else {
      console.log("✅ FCM token saved for", platform);
    }
  } catch (err) {
    console.error("❌ Error saving FCM token:", err);
  }
}

/**
 * Dual-platform push notification hook.
 * - Native (iOS/Android): Uses @capacitor/push-notifications (APNs / FCM)
 * - Web: Uses the Web Push API (Notification)
 *
 * Automatically saves FCM tokens to Supabase for server-side push delivery.
 */
export function usePushNotifications() {
  const { toast } = useToast();
  const native = isNative();
  const listenersAttached = useRef(false);

  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: "unsupported",
    isEnabled: false,
    fcmToken: null,
  });

  useEffect(() => {
    if (native) {
      // Native: dynamically import Capacitor push plugin
      import("@capacitor/push-notifications")
        .then(({ PushNotifications }) => {
          PushNotifications.checkPermissions().then(({ receive }) => {
            setState((prev) => ({
              ...prev,
              isSupported: true,
              permission:
                receive === "granted"
                  ? "granted"
                  : receive === "denied"
                    ? "denied"
                    : "default",
              isEnabled: receive === "granted",
            }));
          });

          // Attach listeners only once
          if (!listenersAttached.current) {
            listenersAttached.current = true;

            // When registration succeeds, we get the FCM token
            PushNotifications.addListener("registration", (token) => {
              console.log("🔑 Push registration token:", token.value);
              setState((prev) => ({ ...prev, fcmToken: token.value }));
              saveFcmTokenToSupabase(token.value);
            });

            // Registration error
            PushNotifications.addListener("registrationError", (error) => {
              console.error("❌ Push registration error:", error);
            });

            // Notification received while app is in foreground
            PushNotifications.addListener(
              "pushNotificationReceived",
              (notification) => {
                console.log("📬 Push received:", notification);
                toast({
                  title: notification.title || "Notification",
                  description: notification.body || "",
                });
              }
            );

            // User tapped on notification
            PushNotifications.addListener(
              "pushNotificationActionPerformed",
              (action) => {
                console.log("👆 Push action:", action);
                const data = action.notification.data;
                if (data?.url) {
                  window.location.href = data.url;
                }
              }
            );
          }
        })
        .catch(() => {
          setState({
            isSupported: false,
            permission: "unsupported",
            isEnabled: false,
            fcmToken: null,
          });
        });
    } else {
      // Web: check browser support
      const isSupported =
        "Notification" in window && "serviceWorker" in navigator;
      if (isSupported) {
        setState((prev) => ({
          ...prev,
          isSupported: true,
          permission: Notification.permission,
          isEnabled: Notification.permission === "granted",
        }));
      }
    }
  }, [native, toast]);

  // Re-save token when user logs in (auth state changes)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && state.fcmToken) {
        saveFcmTokenToSupabase(state.fcmToken);
      }
    });

    return () => subscription.unsubscribe();
  }, [state.fcmToken]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported on this device.",
        variant: "destructive",
      });
      return false;
    }

    try {
      if (native) {
        const { PushNotifications } = await import(
          "@capacitor/push-notifications"
        );
        const result = await PushNotifications.requestPermissions();
        const granted = result.receive === "granted";

        if (granted) {
          await PushNotifications.register();
          toast({
            title: "Notifications Enabled",
            description: "You'll receive important pet health reminders.",
          });
        } else {
          toast({
            title: "Notifications Blocked",
            description: "Please enable notifications in Settings.",
            variant: "destructive",
          });
        }

        setState((prev) => ({
          ...prev,
          permission: granted ? "granted" : "denied",
          isEnabled: granted,
        }));
        return granted;
      } else {
        const permission = await Notification.requestPermission();
        setState((prev) => ({
          ...prev,
          permission,
          isEnabled: permission === "granted",
        }));

        if (permission === "granted") {
          toast({
            title: "Notifications Enabled",
            description: "You'll receive important pet health reminders.",
          });
          return true;
        } else if (permission === "denied") {
          toast({
            title: "Notifications Blocked",
            description:
              "Please enable notifications in your browser settings.",
            variant: "destructive",
          });
        }
        return false;
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [state.isSupported, native, toast]);

  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions): boolean => {
      if (!state.isEnabled) return false;

      try {
        if (native) {
          // On native, local notifications require @capacitor/local-notifications
          // For now, use toast as local fallback; server-sent push handles the rest
          toast({ title, description: options?.body || "" });
          return true;
        } else {
          new Notification(title, {
            icon: "/favicon.png",
            badge: "/favicon.png",
            ...options,
          });
          return true;
        }
      } catch (error) {
        console.error("Error sending notification:", error);
        return false;
      }
    },
    [state.isEnabled, native, toast]
  );

  // Predefined notification types
  const notifyTriageComplete = useCallback(
    (petName: string, status: string) =>
      sendNotification(`${petName}'s Assessment Complete`, {
        body: `Priority: ${status}. Tap to view results.`,
        tag: "triage-complete",
      }),
    [sendNotification]
  );

  const notifyPremiumReminder = useCallback(
    () =>
      sendNotification("Unlock Full Results", {
        body: "Your pet's triage is ready. Upgrade to see the full assessment.",
        tag: "premium-reminder",
      }),
    [sendNotification]
  );

  const notifyCommissionEarned = useCallback(
    (amount: number) =>
      sendNotification("Commission Earned! 💰", {
        body: `You earned $${amount.toFixed(2)} from a referral.`,
        tag: "commission-earned",
      }),
    [sendNotification]
  );

  return {
    ...state,
    requestPermission,
    sendNotification,
    notifyTriageComplete,
    notifyPremiumReminder,
    notifyCommissionEarned,
  };
}
