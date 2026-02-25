import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { isNative } from "@/lib/platform";

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | "unsupported";
  isEnabled: boolean;
}

/**
 * Dual-platform push notification hook.
 * - Native (iOS/Android): Uses @capacitor/push-notifications (APNs / FCM)
 * - Web: Uses the Web Push API (Notification)
 */
export function usePushNotifications() {
  const { toast } = useToast();
  const native = isNative();

  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: "unsupported",
    isEnabled: false,
  });

  useEffect(() => {
    if (native) {
      // Native: dynamically import Capacitor push plugin
      import("@capacitor/push-notifications").then(({ PushNotifications }) => {
        PushNotifications.checkPermissions().then(({ receive }) => {
          setState({
            isSupported: true,
            permission: receive === "granted" ? "granted" : receive === "denied" ? "denied" : "default",
            isEnabled: receive === "granted",
          });
        });

        // Listen for incoming notifications while app is open
        PushNotifications.addListener("pushNotificationReceived", (notification) => {
          toast({
            title: notification.title || "Notification",
            description: notification.body || "",
          });
        });
      }).catch(() => {
        // Plugin not available, fall back to unsupported
        setState({ isSupported: false, permission: "unsupported", isEnabled: false });
      });
    } else {
      // Web: check browser support
      const isSupported = "Notification" in window && "serviceWorker" in navigator;
      if (isSupported) {
        setState({
          isSupported: true,
          permission: Notification.permission,
          isEnabled: Notification.permission === "granted",
        });
      }
    }
  }, [native, toast]);

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
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const result = await PushNotifications.requestPermissions();
        const granted = result.receive === "granted";

        if (granted) {
          await PushNotifications.register();
          toast({ title: "Notifications Enabled", description: "You'll receive important pet health reminders." });
        } else {
          toast({ title: "Notifications Blocked", description: "Please enable notifications in Settings.", variant: "destructive" });
        }

        setState((prev) => ({ ...prev, permission: granted ? "granted" : "denied", isEnabled: granted }));
        return granted;
      } else {
        const permission = await Notification.requestPermission();
        setState((prev) => ({ ...prev, permission, isEnabled: permission === "granted" }));

        if (permission === "granted") {
          toast({ title: "Notifications Enabled", description: "You'll receive important pet health reminders." });
          return true;
        } else if (permission === "denied") {
          toast({ title: "Notifications Blocked", description: "Please enable notifications in your browser settings.", variant: "destructive" });
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
          new Notification(title, { icon: "/favicon.png", badge: "/favicon.png", ...options });
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
      sendNotification(`${petName}'s Assessment Complete`, { body: `Priority: ${status}. Tap to view results.`, tag: "triage-complete" }),
    [sendNotification]
  );

  const notifyPremiumReminder = useCallback(
    () => sendNotification("Unlock Full Results", { body: "Your pet's triage is ready. Upgrade to see the full assessment.", tag: "premium-reminder" }),
    [sendNotification]
  );

  const notifyCommissionEarned = useCallback(
    (amount: number) => sendNotification("Commission Earned! 💰", { body: `You earned $${amount.toFixed(2)} from a referral.`, tag: "commission-earned" }),
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
