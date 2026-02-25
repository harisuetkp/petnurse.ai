import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export function useReferralTracking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [influencerId, setInfluencerId] = useState<string | null>(null);

  useEffect(() => {
    const ref = searchParams.get("ref");
    
    if (ref) {
      // Store in localStorage for persistence
      localStorage.setItem("petnurse_referral_code", ref);
      setReferralCode(ref);
      
      // Track the click
      trackReferralClick(ref);
      
      // Remove ref from URL to clean it up
      searchParams.delete("ref");
      setSearchParams(searchParams, { replace: true });
    } else {
      // Check localStorage for existing referral
      const storedRef = localStorage.getItem("petnurse_referral_code");
      if (storedRef) {
        setReferralCode(storedRef);
      }
    }
  }, [searchParams, setSearchParams]);

  const trackReferralClick = async (code: string) => {
    await supabase.functions.invoke("track-referral-click", {
      body: { 
        promoCode: code,
        userAgent: navigator.userAgent,
      },
    });
  };

  const setInfluencerForCheckout = (id: string) => {
    setInfluencerId(id);
    if (referralCode) {
      localStorage.setItem("petnurse_influencer_id", id);
    }
  };

  const clearReferral = () => {
    localStorage.removeItem("petnurse_referral_code");
    localStorage.removeItem("petnurse_influencer_id");
    setReferralCode(null);
    setInfluencerId(null);
  };

  const getStoredInfluencerId = () => {
    return influencerId || localStorage.getItem("petnurse_influencer_id");
  };

  return {
    referralCode,
    influencerId: getStoredInfluencerId(),
    setInfluencerForCheckout,
    clearReferral,
  };
}
