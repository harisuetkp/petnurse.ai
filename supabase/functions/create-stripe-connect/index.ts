import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { validateAuth, unauthorizedResponse } from "../_shared/auth.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CONNECT] ${step}${detailsStr}`);
};

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
    
    // Check if user is an influencer
    const { data: influencer, error: influencerError } = await supabaseClient
      .from("influencers")
      .select("id, stripe_connect_id, promo_code")
      .eq("user_id", authResult.userId)
      .single();
    
    if (influencerError || !influencer) {
      logStep("User is not an influencer", { userId: authResult.userId });
      return new Response(
        JSON.stringify({ error: "You are not registered as an influencer" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }
    
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });
    
    const origin = req.headers.get("origin") || "https://petnurseai.com";
    
    // If already has a Stripe Connect account, create login link
    if (influencer.stripe_connect_id) {
      logStep("Creating login link for existing account", { 
        connectId: influencer.stripe_connect_id 
      });
      
      try {
        const loginLink = await stripe.accounts.createLoginLink(
          influencer.stripe_connect_id
        );
        
        return new Response(
          JSON.stringify({ url: loginLink.url, type: "login" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } catch {
        // Account might not be fully set up, create new onboarding link
        logStep("Failed to create login link, creating new onboarding link");
      }
    }
    
    // Create new Stripe Connect Express account
    let accountId = influencer.stripe_connect_id;
    
    if (!accountId) {
      logStep("Creating new Stripe Connect Express account");
      
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: authResult.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: {
          influencer_id: influencer.id,
          promo_code: influencer.promo_code,
        },
      });
      
      accountId = account.id;
      
      // Save the Stripe Connect ID
      const { error: updateError } = await supabaseClient
        .from("influencers")
        .update({ stripe_connect_id: accountId })
        .eq("id", influencer.id);
      
      if (updateError) {
        logStep("Failed to save Stripe Connect ID", { error: updateError.message });
        throw updateError;
      }
      
      logStep("Stripe Connect account created", { accountId });
    }
    
    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/influencer?refresh=true`,
      return_url: `${origin}/influencer?connected=true`,
      type: "account_onboarding",
    });
    
    logStep("Account link created", { url: accountLink.url });
    
    return new Response(
      JSON.stringify({ url: accountLink.url, type: "onboarding" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: "Failed to set up Stripe Connect" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
