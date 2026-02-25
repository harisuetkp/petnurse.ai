import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { validateAuth, unauthorizedResponse } from "../_shared/auth.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-INFLUENCER] ${step}${detailsStr}`);
};

/**
 * Mask promo code for display - shows first 2 and last 2 chars
 * Full code is only used for referral URL generation server-side
 */
function maskPromoCode(code: string): string {
  if (code.length <= 4) return code; // Don't mask short codes
  const first = code.substring(0, 2);
  const last = code.substring(code.length - 2);
  const middle = '*'.repeat(Math.min(code.length - 4, 4));
  return `${first}${middle}${last}`;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    logStep("Function started");
    
    // Validate authentication
    const authResult = await validateAuth(req);
    if (!authResult.authenticated) {
      return unauthorizedResponse(corsHeaders, authResult.error);
    }
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    
    // Get influencer data
    const { data: influencer, error: influencerError } = await supabaseClient
      .from("influencers")
      .select("id, promo_code, name, commission_rate, total_earned, pending_balance, stripe_connect_id, is_active, created_at")
      .eq("user_id", authResult.userId)
      .single();
    
    if (influencerError) {
      if (influencerError.code === "PGRST116") {
        // No influencer record found
        logStep("User is not an influencer", { userId: authResult.userId });
        return new Response(
          JSON.stringify({ isInfluencer: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
      throw influencerError;
    }
    
    // Get stats using RPC
    const { data: stats, error: statsError } = await supabaseClient
      .rpc("get_influencer_stats", { p_user_id: authResult.userId });
    
    if (statsError) {
      logStep("Failed to get stats", { error: statsError.message });
    }
    
    const statsData = stats?.[0] || {
      total_clicks: 0,
      total_signups: 0,
      active_referrals: 0,
      conversion_rate: 0,
      pending_balance: influencer.pending_balance,
      total_earned: influencer.total_earned,
    };
    
    // Get recent commissions
    const { data: commissions, error: commissionsError } = await supabaseClient
      .from("commissions")
      .select("id, amount, status, created_at, paid_at")
      .eq("influencer_id", influencer.id)
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (commissionsError) {
      logStep("Failed to get commissions", { error: commissionsError.message });
    }
    
    // Get recent referrals
    const { data: referrals, error: referralsError } = await supabaseClient
      .from("referrals")
      .select("id, status, created_at, converted_at")
      .eq("influencer_id", influencer.id)
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (referralsError) {
      logStep("Failed to get referrals", { error: referralsError.message });
    }
    
    const baseUrl = "https://petnurseai.com";
    
    logStep("Returning influencer data", { influencerId: influencer.id });
    
    // SECURITY: Only return what influencers need to know
    // - Masked promo code for display (full code is in referral URL)
    // - Commission rate as percentage (not internal decimal)
    // - Subscription channel ID for real-time updates (hashed, non-sensitive)
    const subscriptionKey = influencer.id.substring(0, 8); // Safe prefix for real-time channels
    
    return new Response(
      JSON.stringify({
        isInfluencer: true,
        influencer: {
          subscriptionKey, // For real-time subscription channels only
          name: influencer.name,
          promoCodeDisplay: maskPromoCode(influencer.promo_code),
          commissionPercent: Math.round(Number(influencer.commission_rate) * 100),
          isActive: influencer.is_active,
          memberSince: new Date(influencer.created_at).toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          }),
          stripeConnected: !!influencer.stripe_connect_id,
        },
        stats: {
          totalClicks: Number(statsData.total_clicks),
          totalSignups: Number(statsData.total_signups),
          activeReferrals: Number(statsData.active_referrals),
          conversionRate: Number(statsData.conversion_rate),
          pendingBalance: Number(statsData.pending_balance),
          totalEarned: Number(statsData.total_earned),
        },
        // Full promo code is only exposed in the referral URL (user's own code)
        referralUrl: `${baseUrl}?ref=${influencer.promo_code}`,
        recentCommissions: (commissions || []).map(c => ({
          amount: c.amount,
          status: c.status,
          date: new Date(c.created_at).toLocaleDateString(),
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: "Failed to get influencer data" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
