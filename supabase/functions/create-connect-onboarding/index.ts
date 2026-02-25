import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONNECT-ONBOARDING] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    logStep("Function started");
    
    // Validate authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      logStep("Auth failed", { error: userError?.message });
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    logStep("User authenticated", { userId });
    
    // Check if user is an influencer
    const { data: influencer, error: influencerError } = await supabaseClient
      .from("influencers")
      .select("id, stripe_connect_id, promo_code, name")
      .eq("user_id", userId)
      .single();
    
    if (influencerError || !influencer) {
      logStep("User is not an influencer", { userId });
      return new Response(
        JSON.stringify({ error: "You are not registered as an influencer" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    logStep("Influencer found", { influencerId: influencer.id });
    
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      logStep("ERROR", { message: "STRIPE_SECRET_KEY not configured" });
      return new Response(
        JSON.stringify({ error: "Payment service not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });
    
    // Use request origin or fallback to production domain
    const origin = req.headers.get("origin") || "https://petnurseai.com";
    const dashboardUrl = `${origin}/influencer`;
    
    let accountId = influencer.stripe_connect_id;
    
    // If already has a Stripe Connect account, create login link to manage it
    if (accountId) {
      logStep("Existing account found, creating login link", { accountId });
      
      try {
        const loginLink = await stripe.accounts.createLoginLink(accountId);
        return new Response(
          JSON.stringify({ url: loginLink.url, type: "login" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } catch (loginError) {
        // Account might not be fully onboarded yet, create new onboarding link
        logStep("Login link failed, creating onboarding link instead", { 
          error: loginError instanceof Error ? loginError.message : String(loginError) 
        });
      }
    }
    
    // Create new Stripe Connect Express account if none exists
    if (!accountId) {
      logStep("Creating new Stripe Connect Express account");
      
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: userEmail,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: {
          influencer_id: influencer.id,
          promo_code: influencer.promo_code,
          influencer_name: influencer.name || "",
        },
      });
      
      accountId = account.id;
      
      // Store the Stripe Connect ID in the influencers table
      const { error: updateError } = await supabaseClient
        .from("influencers")
        .update({ stripe_connect_id: accountId })
        .eq("id", influencer.id);
      
      if (updateError) {
        logStep("Failed to save Stripe Connect ID", { error: updateError.message });
        throw new Error("Failed to save account information");
      }
      
      logStep("Stripe Connect account created and saved", { accountId });
    }
    
    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${dashboardUrl}?stripe_refresh=true`,
      return_url: `${dashboardUrl}?stripe_connected=true`,
      type: "account_onboarding",
    });
    
    logStep("Account onboarding link created", { url: accountLink.url });
    
    return new Response(
      JSON.stringify({ url: accountLink.url, type: "onboarding" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
