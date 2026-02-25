import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Native haptic feedback hook for Apple-like tactile responses
 * Falls back gracefully when not running in Capacitor
 */
export function useHaptics() {
  const isNative = typeof window !== 'undefined' && 'Capacitor' in window;

  const impact = async (style: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      if (isNative) {
        const impactStyle = {
          light: ImpactStyle.Light,
          medium: ImpactStyle.Medium,
          heavy: ImpactStyle.Heavy,
        }[style];
        await Haptics.impact({ style: impactStyle });
      } else {
        // Web fallback using vibration API
        if (navigator.vibrate) {
          const duration = { light: 10, medium: 20, heavy: 30 }[style];
          navigator.vibrate(duration);
        }
      }
    } catch (e) {
      // Silently fail if haptics unavailable
    }
  };

  const notification = async (type: 'success' | 'warning' | 'error' = 'success') => {
    try {
      if (isNative) {
        const notificationType = {
          success: NotificationType.Success,
          warning: NotificationType.Warning,
          error: NotificationType.Error,
        }[type];
        await Haptics.notification({ type: notificationType });
      } else {
        if (navigator.vibrate) {
          const pattern = {
            success: [10, 50, 10],
            warning: [20, 100, 20],
            error: [50, 100, 50, 100, 50],
          }[type];
          navigator.vibrate(pattern);
        }
      }
    } catch (e) {
      // Silently fail
    }
  };

  const selection = async () => {
    try {
      if (isNative) {
        await Haptics.selectionStart();
        await Haptics.selectionChanged();
        await Haptics.selectionEnd();
      } else if (navigator.vibrate) {
        navigator.vibrate(5);
      }
    } catch (e) {
      // Silently fail
    }
  };

  return { impact, notification, selection };
}

// Standalone functions for use without hook context
export const hapticImpact = async (style: 'light' | 'medium' | 'heavy' = 'light') => {
  try {
    const isNative = typeof window !== 'undefined' && 'Capacitor' in window;
    if (isNative) {
      const impactStyle = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      }[style];
      await Haptics.impact({ style: impactStyle });
    } else if (navigator.vibrate) {
      const duration = { light: 10, medium: 20, heavy: 30 }[style];
      navigator.vibrate(duration);
    }
  } catch (e) {
    // Silently fail
  }
};
