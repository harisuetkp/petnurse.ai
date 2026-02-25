import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REFERRAL-PAYOUT] ${step}${detailsStr}`);
};

// Stripe webhook secret - needed to verify webhook signatures
const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");
    
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });
    
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    let event: Stripe.Event;
    
    // Require webhook signature verification
    if (!endpointSecret) {
      logStep("ERROR: STRIPE_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook signature verification not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!signature) {
      logStep("ERROR: Missing stripe-signature header");
      return new Response(
        JSON.stringify({ error: "Missing stripe-signature header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
      logStep("Webhook signature verified");
    } catch (err) {
      logStep("Webhook signature verification failed", { error: err instanceof Error ? err.message : String(err) });
      return new Response(
        JSON.stringify({ error: "Webhook signature verification failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Only process invoice.paid events
    if (event.type !== "invoice.paid") {
      logStep("Ignoring event type", { type: event.type });
      return new Response(
        JSON.stringify({ received: true, processed: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    const invoice = event.data.object as Stripe.Invoice;
    logStep("Processing invoice.paid", { invoiceId: invoice.id });
    
    // Check for influencer_id in metadata
    const influencerId = invoice.metadata?.influencer_id || 
                         invoice.subscription_details?.metadata?.influencer_id;
    
    if (!influencerId) {
      logStep("No influencer_id in metadata, skipping");
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: "No influencer attribution" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    logStep("Found influencer attribution", { influencerId });
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    
    // Get influencer commission rate
    const { data: influencer, error: fetchError } = await supabaseClient
      .from("influencers")
      .select("id, commission_rate, pending_balance, total_earned")
      .eq("id", influencerId)
      .single();
    
    if (fetchError || !influencer) {
      logStep("Influencer not found", { influencerId, error: fetchError?.message });
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: "Influencer not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    // Calculate commission (commission rate * net payment)
    const netAmount = (invoice.amount_paid || 0) / 100; // Convert from cents
    const commissionAmount = Number((netAmount * Number(influencer.commission_rate)).toFixed(2));
    
    logStep("Calculating commission", { 
      netAmount, 
      commissionRate: influencer.commission_rate,
      commissionAmount 
    });
    
    // Check for duplicate transaction
    const { data: existingCommission } = await supabaseClient
      .from("commissions")
      .select("id")
      .eq("source_transaction_id", invoice.id)
      .single();
    
    if (existingCommission) {
      logStep("Duplicate transaction, skipping", { invoiceId: invoice.id });
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: "Duplicate transaction" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    // Insert commission record
    const { error: insertError } = await supabaseClient
      .from("commissions")
      .insert({
        influencer_id: influencerId,
        amount: commissionAmount,
        source_transaction_id: invoice.id,
        status: "pending",
      });
    
    if (insertError) {
      logStep("Failed to insert commission", { error: insertError.message });
      throw insertError;
    }
    
    // Update influencer pending balance
    const newPendingBalance = Number(influencer.pending_balance) + commissionAmount;
    
    const { error: updateError } = await supabaseClient
      .from("influencers")
      .update({ pending_balance: newPendingBalance })
      .eq("id", influencerId);
    
    if (updateError) {
      logStep("Failed to update pending balance", { error: updateError.message });
      throw updateError;
    }
    
    logStep("Commission recorded successfully", { 
      influencerId, 
      commissionAmount, 
      newPendingBalance 
    });
    
    return new Response(
      JSON.stringify({ 
        received: true, 
        processed: true,
        commissionAmount,
        influencerId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: "Webhook processing failed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
