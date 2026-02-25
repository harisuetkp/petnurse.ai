import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

// Price IDs for PetNurse AI
const PRICES = {
  subscription: "price_1StHdoB7Sb0oRyZ01bBIm0aN", // $9.99/mo
  yearly: "price_1T0863B7Sb0oRyZ0j6Pq8In9", // $47.95/year with 7-day trial
  oneTime: "price_1StHgYB7Sb0oRyZ0w9FThYDh", // $5.99 Single Assessment
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    logStep("Function started");

    const { priceType = "subscription", influencerId } = await req.json();
    logStep("Price type requested", { priceType, hasInfluencer: !!influencerId });

    // Auth is now OPTIONAL — guests can checkout via Stripe-hosted email collection
    let userId: string | undefined;
    let userEmail: string | undefined;
    let customerId: string | undefined;

    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { 
          auth: { persistSession: false },
          global: { headers: { Authorization: authHeader } }
        }
      );

      const { data: userData } = await supabaseClient.auth.getUser(token);
      if (userData?.user) {
        userId = userData.user.id;
        userEmail = userData.user.email;
        logStep("User authenticated", { userId, email: userEmail });
      }
    }

    if (!userId) {
      logStep("Guest checkout — no auth");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer already exists (only if we have an email)
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing customer", { customerId });
      }
    }

    // Determine price and mode
    let priceId: string;
    let mode: "subscription" | "payment";

    if (priceType === "yearly") {
      priceId = PRICES.yearly;
      mode = "subscription";
    } else if (priceType === "subscription") {
      priceId = PRICES.subscription;
      mode = "subscription";
    } else {
      priceId = PRICES.oneTime;
      mode = "payment";
    }
    
    logStep("Creating checkout session", { priceId, mode, priceType, influencerId });

    // Build metadata with influencer attribution and payment type
    const metadata: Record<string, string> = {
      type: priceType,
    };
    if (userId) metadata.user_id = userId;
    if (influencerId) metadata.influencer_id = influencerId;

    const origin = req.headers.get("origin") || "https://safe-pet-scan.lovable.app";

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode as "subscription" | "payment",
      success_url: `${origin}/triage?payment=success`,
      cancel_url: `${origin}/premium`,
      metadata,
      automatic_tax: { enabled: true },
      ...(influencerId 
        ? { discounts: [{ coupon: "m8o5w8LL" }] }
        : { allow_promotion_codes: true }
      ),
      // Require payment method upfront for trials
      ...(mode === "subscription" ? {
        payment_method_collection: "always" as const,
      } : {}),
      payment_intent_data: mode === "payment" ? {
        receipt_email: userEmail,
      } : undefined,
      invoice_creation: mode === "payment" ? {
        enabled: true,
        invoice_data: {
          description: "PetNurse AI - Single Assessment",
          footer: "Thank you for using PetNurse AI! Your pet's health matters to us.",
        },
      } : undefined,
    };

    // For subscriptions, add metadata and invoice settings
    if (mode === "subscription") {
      sessionConfig.subscription_data = {
        metadata: {
          ...(userId ? { user_id: userId } : {}),
          ...(influencerId ? { influencer_id: influencerId } : {}),
        },
        invoice_settings: {
          issuer: { type: "self" },
        },
        // Add 7-day trial ONLY for yearly plan
        ...(priceType === "yearly" ? {
          trial_period_days: 7,
        } : {}),
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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
