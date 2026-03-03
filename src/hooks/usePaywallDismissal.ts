/**
 * Tracks paywall dismissals to enable softer re-engagement on subsequent visits.
 * Persists to localStorage for cross-session tracking.
 */
import { useState, useCallback } from "react";

const DISMISSAL_KEY = "pn_paywall_dismissals";
const LAST_DISMISS_KEY = "pn_paywall_last_dismiss";

interface DismissalData {
  count: number;
  lastDismissedAt: number;
}

function getDismissalData(): DismissalData {
  try {
    const count = parseInt(localStorage.getItem(DISMISSAL_KEY) || "0", 10);
    const lastDismissedAt = parseInt(localStorage.getItem(LAST_DISMISS_KEY) || "0", 10);
    return { count, lastDismissedAt };
  } catch {
    return { count: 0, lastDismissedAt: 0 };
  }
}

export function usePaywallDismissal() {
  const [data, setData] = useState<DismissalData>(getDismissalData);

  const recordDismissal = useCallback(() => {
    const newCount = data.count + 1;
    const now = Date.now();
    localStorage.setItem(DISMISSAL_KEY, String(newCount));
    localStorage.setItem(LAST_DISMISS_KEY, String(now));
    setData({ count: newCount, lastDismissedAt: now });
  }, [data.count]);

  const timeSinceLastDismissal = data.lastDismissedAt ? Date.now() - data.lastDismissedAt : Infinity;
  const hoursSinceLastDismissal = timeSinceLastDismissal / (1000 * 60 * 60);

  // After 2+ dismissals, show softer messaging
  const shouldShowSoftApproach = data.count >= 2;

  // After dismissal, wait at least 2 hours before showing again
  const shouldSuppressPaywall = data.count > 0 && hoursSinceLastDismissal < 2;

  return {
    dismissalCount: data.count,
    recordDismissal,
    shouldShowSoftApproach,
    shouldSuppressPaywall,
    hoursSinceLastDismissal,
  };
}
