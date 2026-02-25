import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { validateAuth, unauthorizedResponse } from "../_shared/auth.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-PAYOUTS] ${step}${detailsStr}`);
};

const MIN_PAYOUT_AMOUNT = 50; // Minimum $50 balance for payout

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
    
    // Check if user is admin
    const { data: isAdmin } = await supabaseClient
      .rpc("has_role", { _user_id: authResult.userId, _role: "admin" });
    
    if (!isAdmin) {
      logStep("Non-admin access attempt", { userId: authResult.userId });
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }
    
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });
    
    // Get all influencers with pending balance >= minimum
    const { data: influencers, error: fetchError } = await supabaseClient
      .from("influencers")
      .select("id, user_id, pending_balance, total_earned, stripe_connect_id, promo_code")
      .gte("pending_balance", MIN_PAYOUT_AMOUNT)
      .eq("is_active", true);
    
    if (fetchError) {
      logStep("Failed to fetch influencers", { error: fetchError.message });
      throw fetchError;
    }
    
    if (!influencers || influencers.length === 0) {
      logStep("No influencers eligible for payout");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `No influencers with balance >= $${MIN_PAYOUT_AMOUNT}`,
          processed: 0,
          totalPaid: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    logStep("Found eligible influencers", { count: influencers.length });
    
    const results: { influencerId: string; success: boolean; amount?: number; error?: string }[] = [];
    let totalPaid = 0;
    
    for (const influencer of influencers) {
      try {
        if (!influencer.stripe_connect_id) {
          logStep("Skipping - no Stripe Connect", { influencerId: influencer.id });
          results.push({
            influencerId: influencer.id,
            success: false,
            error: "No Stripe Connect account linked",
          });
          continue;
        }
        
        const payoutAmount = Math.floor(Number(influencer.pending_balance) * 100); // Convert to cents
        
        logStep("Creating transfer", { 
          influencerId: influencer.id, 
          amount: payoutAmount / 100,
          connectId: influencer.stripe_connect_id 
        });
        
        // Create Stripe Transfer to connected account
        const transfer = await stripe.transfers.create({
          amount: payoutAmount,
          currency: "usd",
          destination: influencer.stripe_connect_id,
          description: `PetNurse AI Affiliate Payout - ${influencer.promo_code}`,
          metadata: {
            influencer_id: influencer.id,
            promo_code: influencer.promo_code,
          },
        });
        
        logStep("Transfer created", { transferId: transfer.id });
        
        // Update influencer balances
        const newTotalEarned = Number(influencer.total_earned) + Number(influencer.pending_balance);
        
        const { error: updateError } = await supabaseClient
          .from("influencers")
          .update({ 
            pending_balance: 0,
            total_earned: newTotalEarned,
          })
          .eq("id", influencer.id);
        
        if (updateError) {
          throw updateError;
        }
        
        // Update all pending commissions to paid
        const { error: commissionError } = await supabaseClient
          .from("commissions")
          .update({ 
            status: "paid",
            paid_at: new Date().toISOString(),
          })
          .eq("influencer_id", influencer.id)
          .eq("status", "pending");
        
        if (commissionError) {
          logStep("Warning: Failed to update commission statuses", { error: commissionError.message });
        }
        
        results.push({
          influencerId: influencer.id,
          success: true,
          amount: payoutAmount / 100,
        });
        
        totalPaid += payoutAmount / 100;
        
      } catch (payoutError) {
        const errorMsg = payoutError instanceof Error ? payoutError.message : String(payoutError);
        logStep("Payout failed", { influencerId: influencer.id, error: errorMsg });
        results.push({
          influencerId: influencer.id,
          success: false,
          error: errorMsg,
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    logStep("Payout processing complete", { 
      total: influencers.length, 
      successful: successCount,
      totalPaid,
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        processed: influencers.length,
        successful: successCount,
        totalPaid,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: "Failed to process payouts" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
