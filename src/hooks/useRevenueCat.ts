/**
 * Native IAP integration hook for iOS.
 */

import { useState, useCallback, useEffect } from "react";
import { NativePurchases } from "@capgo/native-purchases";
import { Capacitor } from "@capacitor/core";

export interface RevenueCatPackage {
  identifier: string;
  productId: string;
  priceString: string;
  planType: string;
}

interface RevenueCatState {
  isReady: boolean;
  isPremium: boolean;
  packages: RevenueCatPackage[];
  isLoading: boolean;
  error: string | null;
}

export function useRevenueCat() {
  const [state, setState] = useState<RevenueCatState>({
    isReady: false,
    isPremium: false,
    packages: [],
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      NativePurchases.getProducts({
        productIdentifiers: ["$rc_annual", "$rc_monthly", "single_assessment"]
      }).then((result) => {
        if (result.products) {
          setState((s) => ({
            ...s,
            packages: result.products.map((p: any) => ({
              identifier: p.identifier,
              productId: p.identifier,
              priceString: p.priceString,
              planType: p.identifier.includes("annual") ? "yearly" : (p.identifier.includes("monthly") ? "monthly" : "oneTime")
            })),
            isReady: true
          }));
        }
      }).catch(e => console.error("InAppPurchase Error:", e));
    }
  }, []);

  const initialize = useCallback(async (_userId?: string) => {
    // Initialization handled inherently by plugin or on app startup
  }, []);

  const purchasePackage = useCallback(async (_packageId: string): Promise<boolean> => {
    try {
      const result = await NativePurchases.purchaseProduct({ productIdentifier: _packageId });
      return !!result.transactionId;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, []);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    try {
      await NativePurchases.restorePurchases();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, []);

  const checkEntitlements = useCallback(async (): Promise<boolean> => {
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
