import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { logStep as secureLogStep } from "../_shared/logging.ts";

// Product IDs for PetNurse AI
const PRODUCTS = {
  subscription: "prod_Tqj8ItXv0H8HQ9", // Peace of Mind Subscription
  oneTime: "prod_Tqj9ZOEjMPJKXz", // Single Assessment
};

// Use secure logging that sanitizes in production
const logStep = (step: string, details?: unknown) => {
  secureLogStep(step, details as Record<string, unknown> | undefined);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Validate auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Create Supabase client with service role for reliable user validation
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Use getUser() which is more reliable than getClaims()
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData?.user) {
      logStep("User authentication failed", { error: userError?.message });
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const user = userData.user;
    const userId = user.id;
    const userEmail = user.email;
    
    if (!userEmail) {
      throw new Error("User email not available");
    }
    
    logStep("User authenticated", { userId, email: userEmail });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ 
        subscribed: false, 
        hasOneTimePurchase: false,
        isPremium: false,
        scanCredits: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for active subscription with our specific product
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });
    
    // SECURITY: Only count subscriptions for our specific product
    const validSubscription = subscriptions.data.find((sub: Stripe.Subscription) => {
      const productId = sub.items.data[0]?.price?.product;
      return productId === PRODUCTS.subscription;
    });

    const hasActiveSubscription = !!validSubscription;
    let subscriptionEnd = null;
    let productId = null;

    if (hasActiveSubscription && validSubscription) {
      subscriptionEnd = new Date(validSubscription.current_period_end * 1000).toISOString();
      productId = validSubscription.items.data[0].price.product;
      logStep("Active subscription found", { subscriptionId: validSubscription.id, endDate: subscriptionEnd });
    }

    // Get current profile to check scan_credits
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_premium, scan_credits, premium_until")
      .eq("user_id", userId)
      .single();

    const scanCredits = profile?.scan_credits || 0;
    
    if (hasActiveSubscription && !profile?.is_premium) {
      logStep("Subscription active but profile not premium - webhook may be pending");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSubscription,
      isPremium: profile?.is_premium || false,
      scanCredits,
      productId,
      subscriptionEnd,
      premiumUntil: profile?.premium_until,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
