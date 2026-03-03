/**
 * RevenueCat integration hook for native IAP (iOS/Android).
 *
 * This is a placeholder that will activate once:
 * 1. The RevenueCat SDK Capacitor plugin is installed
 * 2. The REVENUECAT_API_KEY secret is configured
 * 3. Products are created in App Store Connect / Google Play Console
 *
 * For now it exposes a stable API so the rest of the app can reference it.
 */

import { useState, useCallback } from "react";

export interface RevenueCatPackage {
  identifier: string;
  productId: string;
  priceString: string;
  /** "monthly" | "yearly" | "oneTime" */
  planType: string;
}

interface RevenueCatState {
  isReady: boolean;
  isPremium: boolean;
  packages: RevenueCatPackage[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook that wraps RevenueCat native SDK.
 * Returns a no-op implementation until the native plugin is installed.
 */
export function useRevenueCat() {
  const [state] = useState<RevenueCatState>({
    isReady: false,
    isPremium: false,
    packages: [],
    isLoading: false,
    error: null,
  });

  // ── Placeholder methods ──────────────────────────────────────────────

  const initialize = useCallback(async (_userId?: string) => {
    // TODO: Initialize RevenueCat SDK with REVENUECAT_API_KEY
    // import Purchases from "@revenuecat/purchases-capacitor";
    // await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    // if (_userId) await Purchases.logIn({ appUserID: _userId });
    console.log("[RevenueCat] SDK not yet installed — skipping init");
  }, []);

  const purchasePackage = useCallback(async (_packageId: string): Promise<boolean> => {
    // TODO: Call Purchases.purchasePackage(...)
    console.warn("[RevenueCat] purchasePackage called but SDK not installed");
    return false;
  }, []);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    // TODO: Call Purchases.restorePurchases()
    console.warn("[RevenueCat] restorePurchases called but SDK not installed");
    return false;
  }, []);

  const checkEntitlements = useCallback(async (): Promise<boolean> => {
    // TODO: Check Purchases.getCustomerInfo() for active entitlements
    return false;
  }, []);

  return {
    ...state,
    initialize,
    purchasePackage,
    restorePurchases,
    checkEntitlements,
  };
}
