/**
 * Unified purchase hook — routes to RevenueCat (native) or Stripe (web)
 * based on the current platform.
 */

import { useState, useCallback } from "react";
import { isNative, isIOS } from "@/lib/platform";
import { useNativePurchases } from "@/hooks/useNativePurchases";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type PriceType = "yearly" | "monthly" | "oneTime";

interface PurchaseState {
  isLoading: PriceType | null;
  /** Whether we're running through the native IAP path */
  isNativeIAP: boolean;
}

export function usePurchases() {
  const native = isNative();
  const nativePurchasesHook = useNativePurchases();
  const { toast } = useToast();

  const [state, setState] = useState<PurchaseState>({
    isLoading: null,
    isNativeIAP: isIOS(),
  });

  // ── Stripe web checkout (existing flow) ──────────────────────────────

  const stripeCheckout = useCallback(
    async (priceType: PriceType, influencerId?: string | null) => {
      const mappedType = priceType === "monthly" ? "subscription" : priceType;

      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            priceType: mappedType,
            influencerId: influencerId ?? undefined,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Checkout failed (${response.status})`);
      }

      const data = await response.json();
      if (!data?.url) throw new Error("No checkout URL received");
      window.location.href = data.url;
    },
    [],
  );

  // ── Native IAP ────────────────────────────────────────

  const nativeCheckout = useCallback(
    async (priceType: PriceType) => {
      // Map priceType to package identifier
      const packageMap: Record<PriceType, string> = {
        yearly: "com.petnurseapp.ai.annual",
        monthly: "com.petnurseapp.ai.monthly",
        oneTime: "com.petnurseapp.ai.single",
      };

      const success = await nativePurchasesHook.purchasePackage(packageMap[priceType]);
      if (!success) {
        throw new Error("Purchase was cancelled or failed");
      }
    },
    [nativePurchasesHook],
  );

  // ── Unified purchase method ──────────────────────────────────────────

  const purchase = useCallback(
    async (priceType: PriceType, influencerId?: string | null) => {
      setState((s) => ({ ...s, isLoading: priceType }));
      try {
        if (isIOS()) {
          await nativeCheckout(priceType);
        } else {
          await stripeCheckout(priceType, influencerId);
        }
      } catch (error) {
        toast({
          title: "Purchase Error",
          description:
            error instanceof Error ? error.message : "Failed to start checkout.",
          variant: "destructive",
        });
      } finally {
        setState((s) => ({ ...s, isLoading: null }));
      }
    },
    [native, nativeCheckout, stripeCheckout, toast],
  );

  // ── Restore purchases (native only) ─────────────────────────────────

  const restore = useCallback(async () => {
    if (!isIOS()) {
      toast({
        title: "Not Available",
        description: "Restore purchases is only available in the app.",
      });
      return false;
    }

    setState((s) => ({ ...s, isLoading: "yearly" }));
    try {
      const restored = await nativePurchasesHook.restorePurchases();
      if (restored) {
        toast({ title: "Purchases Restored", description: "Your premium access has been restored." });
      } else {
        toast({
          title: "No Purchases Found",
          description: "We couldn't find any previous purchases to restore.",
          variant: "destructive",
        });
      }
      return restored;
    } finally {
      setState((s) => ({ ...s, isLoading: null }));
    }
  }, [native, nativePurchasesHook, toast]);

  return {
    purchase,
    restore,
    isLoading: state.isLoading,
    isNativeIAP: state.isNativeIAP,
    /** Packages (only populated on iOS) */
    packages: nativePurchasesHook.packages,
  };
}
