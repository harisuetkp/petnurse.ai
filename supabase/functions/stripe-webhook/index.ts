import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

/**
 * Sanitize webhook payload to remove sensitive customer financial information
 * This prevents exposure of PII and payment details in stored logs
 */
function sanitizePayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') {
    return { sanitized: true, original_type: typeof payload };
  }

  const obj = payload as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  // Fields to keep (non-sensitive metadata)
  const safeFields = [
    'id', 'object', 'amount', 'amount_total', 'amount_paid', 'currency',
    'status', 'mode', 'payment_status', 'created', 'livemode',
    'subscription', 'invoice', 'metadata', 'current_period_start',
    'current_period_end', 'cancel_at', 'canceled_at', 'ended_at',
  ];

  // Fields to completely remove (sensitive financial/PII data)
  const sensitiveFields = [
    'customer_email', 'customer_details', 'customer_name', 'customer_phone',
    'billing_details', 'shipping', 'shipping_details', 'address',
    'payment_method', 'payment_method_types', 'payment_method_options',
    'payment_intent', 'card', 'bank', 'source', 'default_payment_method',
    'invoice_settings', 'receipt_email', 'email', 'phone', 'name',
    'last4', 'fingerprint', 'exp_month', 'exp_year', 'brand',
    'customer', // Replace with masked version
  ];

  for (const [key, value] of Object.entries(obj)) {
    // Skip sensitive fields entirely
    if (sensitiveFields.includes(key)) {
      if (key === 'customer' && typeof value === 'string') {
        // Keep customer ID but mask most of it
        sanitized[key] = value.substring(0, 8) + '***';
      }
      continue;
    }

    // Keep safe fields
    if (safeFields.includes(key)) {
      sanitized[key] = value;
      continue;
    }

    // For nested objects, recursively sanitize
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizePayload(value);
    } else if (Array.isArray(value)) {
      // For arrays, just keep length info
      sanitized[key] = { _array_length: value.length };
    } else {
      // Keep other primitive values
      sanitized[key] = value;
    }
  }

  sanitized._sanitized = true;
  sanitized._sanitized_at = new Date().toISOString();

  return sanitized;
}

// Retry wrapper for database operations
async function withRetry<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === retries) throw error;
      logStep(`Retry attempt ${attempt}/${retries}`, { error: error instanceof Error ? error.message : String(error) });
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
    }
  }
  throw new Error("Max retries exceeded");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  // Using 'any' type to avoid strict type checking issues with Supabase client in edge functions
  // deno-lint-ignore no-explicit-any
  const supabaseClient: any = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  let eventId = "unknown";
  let eventType = "unknown";

  try {
    logStep("Webhook received");

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET");

    let event: Stripe.Event;

    // SECURITY: Always require webhook signature verification in production
    if (!webhookSecret) {
      logStep("CRITICAL: STRIPE_WEBHOOK_SIGNING_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!signature) {
      logStep("Missing stripe-signature header");
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    try {
      // CRITICAL: Use async version for Deno/Edge runtime compatibility
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Webhook signature verified");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logStep("Webhook signature verification failed", { error: errorMsg });
      
      // Log failed attempt - no sensitive data, just error info
      await supabaseClient.from("webhook_logs").insert({
        event_id: `failed_${Date.now()}`,
        event_type: "signature_verification_failed",
        payload: { error: errorMsg, _sanitized: true },
        processed: false,
        error_message: errorMsg,
      });
      
      return new Response(
        JSON.stringify({ error: "Webhook signature verification failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    eventId = event.id;
    eventType = event.type;
    logStep("Processing event", { eventId, eventType });

    // Check for duplicate event
    const { data: existingLog } = await supabaseClient
      .from("webhook_logs")
      .select("id, processed")
      .eq("event_id", eventId)
      .single();

    if (existingLog?.processed) {
      logStep("Event already processed, skipping", { eventId });
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: "Already processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Log the event before processing - SANITIZE sensitive data
    if (!existingLog) {
      await supabaseClient.from("webhook_logs").insert({
        event_id: eventId,
        event_type: eventType,
        payload: sanitizePayload(event.data.object),
        processed: false,
      });
    }

    // Process based on event type
    let processed = false;
    let processingResult: Record<string, unknown> = {};

    switch (eventType) {
      case "checkout.session.completed":
        processingResult = await handleCheckoutSessionCompleted(event, supabaseClient, stripe);
        processed = true;
        break;

      case "invoice.paid":
        processingResult = await handleInvoicePaid(event, supabaseClient, stripe);
        processed = true;
        break;

      case "customer.subscription.deleted":
        processingResult = await handleSubscriptionDeleted(event, supabaseClient);
        processed = true;
        break;

      default:
        logStep("Unhandled event type", { eventType });
        processingResult = { reason: "Unhandled event type" };
    }

    // Mark as processed
    await withRetry(async () => {
      const { error } = await supabaseClient
        .from("webhook_logs")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("event_id", eventId);
      if (error) throw error;
    });

    logStep("Event processed successfully", { eventId, ...processingResult });

    return new Response(
      JSON.stringify({ received: true, processed, ...processingResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR processing webhook", { eventId, eventType, message: errorMessage });

    // Update webhook log with error
    await supabaseClient
      .from("webhook_logs")
      .update({
        error_message: errorMessage,
        retry_count: 1,
      })
      .eq("event_id", eventId);

    return new Response(
      JSON.stringify({ error: "Webhook processing failed", eventId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Handle checkout.session.completed
// deno-lint-ignore no-explicit-any
async function handleCheckoutSessionCompleted(
  event: Stripe.Event,
  supabase: any,
  stripe: Stripe
): Promise<Record<string, unknown>> {
  const session = event.data.object as Stripe.Checkout.Session;
  logStep("Processing checkout.session.completed", { sessionId: session.id });

  const userId = session.metadata?.user_id;
  const paymentType = session.metadata?.type || (session.mode === "subscription" ? "subscription" : "one-time");
  let influencerId = session.metadata?.influencer_id;

  if (!userId) {
    logStep("No user_id in metadata, skipping profile update");
    return { warning: "No user_id in metadata" };
  }

  logStep("Session metadata", { userId, paymentType, influencerId });

  // CRITICAL: Check if user already has a permanent influencer attribution
  // If they do, use that for commission (ensures lifetime attribution)
  const { data: profile } = await supabase
    .from("profiles")
    .select("referred_by_influencer_id")
    .eq("user_id", userId)
    .single();

  if (profile?.referred_by_influencer_id) {
    // User already has permanent attribution - use it
    influencerId = profile.referred_by_influencer_id;
    logStep("Using permanent influencer attribution", { influencerId });
  } else if (influencerId) {
    // First purchase with influencer - save permanently to profile
    await withRetry(async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ referred_by_influencer_id: influencerId })
        .eq("user_id", userId);
      if (error) throw error;
    });
    logStep("Saved permanent influencer attribution", { userId, influencerId });
  }

  if (paymentType === "subscription") {
    // Update profile to premium
    await withRetry(async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          is_premium: true,
          premium_until: null
        })
        .eq("user_id", userId);
      if (error) throw error;
    });
    logStep("Profile updated to premium", { userId });
  } else if (paymentType === "one-time") {
    // SECURITY: Use session ID to make credit increment idempotent
    // Check if we've already credited for this session
    const { data: existingCommission } = await supabase
      .from("commissions")
      .select("id")
      .eq("source_transaction_id", `credit_${session.id}`)
      .single();

    if (existingCommission) {
      logStep("Credits already granted for this session, skipping", { sessionId: session.id });
    } else {
      // Increment scan credits atomically
      await withRetry(async () => {
        const { data: creditProfile, error: fetchError } = await supabase
          .from("profiles")
          .select("scan_credits")
          .eq("user_id", userId)
          .single();
        
        if (fetchError) throw fetchError;
        
        const currentCredits = creditProfile?.scan_credits || 0;
        const newCredits = currentCredits + 1;
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ scan_credits: newCredits })
          .eq("user_id", userId);
        
        if (updateError) throw updateError;
      });

      // Record credit grant to prevent duplicates
      await supabase.from("commissions").insert({
        influencer_id: influencerId || "00000000-0000-0000-0000-000000000000",
        amount: 0,
        source_transaction_id: `credit_${session.id}`,
        status: "credit_granted",
      }).catch(() => {
        // If insert fails due to missing influencer, log it but don't fail
        logStep("Could not record credit grant marker");
      });

      logStep("Scan credits incremented", { userId });
    }
  }

  // Process influencer commission if applicable
  if (influencerId && session.amount_total) {
    await processInfluencerCommission(
      supabase,
      influencerId,
      session.amount_total,
      session.id,
      userId
    );
  }

  return { userId, paymentType, influencerId: influencerId || null };
}

// Handle invoice.paid (for recurring subscription payments)
// deno-lint-ignore no-explicit-any
async function handleInvoicePaid(
  event: Stripe.Event,
  supabase: any,
  stripe: Stripe
): Promise<Record<string, unknown>> {
  const invoice = event.data.object as Stripe.Invoice;
  logStep("Processing invoice.paid", { invoiceId: invoice.id });

  // Get customer email to find user
  const customerId = invoice.customer as string;
  let customer: Stripe.Customer | Stripe.DeletedCustomer | null = null;
  
  try {
    customer = await stripe.customers.retrieve(customerId);
  } catch (e) {
    logStep("Failed to retrieve customer", { customerId });
  }

  if (!customer || customer.deleted || !("email" in customer) || !customer.email) {
    logStep("Customer not found or no email", { customerId });
    return { warning: "Customer not found or no email" };
  }

  const customerEmail = customer.email;
  logStep("Found customer email", { customerEmail });

  // Get subscription details for period end
  const subscriptionId = invoice.subscription as string;
  let subscriptionEnd: string | null = null;
  
  if (subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
    } catch (e) {
      logStep("Failed to retrieve subscription", { subscriptionId });
    }
  }

  // Find user by email through auth.users (via get_users_for_admin)
  const { data: users, error: usersError } = await supabase.rpc("get_users_for_admin");
  
  if (usersError) {
    logStep("Failed to get users", { error: usersError.message });
    return { warning: "Failed to lookup users" };
  }

  const user = users?.find((u: { email: string }) => u.email === customerEmail);
  
  if (!user) {
    logStep("User not found for email", { customerEmail });
    return { warning: "User not found" };
  }

  const userId = user.user_id;

  // CRITICAL: Get the user's PERMANENT influencer attribution from profile
  // This ensures influencers get commission on ALL recurring payments, not just first
  const { data: profile } = await supabase
    .from("profiles")
    .select("referred_by_influencer_id")
    .eq("user_id", userId)
    .single();

  // Use permanent attribution from profile, fallback to invoice metadata
  const influencerId = profile?.referred_by_influencer_id || 
                       invoice.metadata?.influencer_id || 
                       invoice.subscription_details?.metadata?.influencer_id;

  logStep("Influencer attribution for recurring payment", { 
    userId, 
    influencerId,
    source: profile?.referred_by_influencer_id ? "permanent_profile" : "invoice_metadata"
  });

  // Update profile with premium status and expiration
  await withRetry(async () => {
    const updateData: Record<string, unknown> = { is_premium: true };
    if (subscriptionEnd) {
      updateData.premium_until = subscriptionEnd;
    }
    
    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", userId);
    
    if (error) throw error;
  });

  logStep("Profile premium_until extended", { userId, subscriptionEnd });

  // Process influencer commission if applicable - uses permanent attribution
  if (influencerId && invoice.amount_paid) {
    await processInfluencerCommission(
      supabase,
      influencerId,
      invoice.amount_paid,
      invoice.id,
      userId
    );
  }

  return { userId, subscriptionEnd, influencerId: influencerId || null };
}

// Handle subscription deleted/cancelled
// deno-lint-ignore no-explicit-any
async function handleSubscriptionDeleted(
  event: Stripe.Event,
  supabase: any
): Promise<Record<string, unknown>> {
  const subscription = event.data.object as Stripe.Subscription;
  logStep("Processing customer.subscription.deleted", { subscriptionId: subscription.id });

  // We could revoke premium here, but typically we let premium_until handle expiration
  // This is just for logging purposes
  
  return { subscriptionId: subscription.id, status: "logged" };
}

// Process influencer commission (10% of net amount after Stripe fees)
// deno-lint-ignore no-explicit-any
async function processInfluencerCommission(
  supabase: any,
  influencerId: string,
  amountInCents: number,
  transactionId: string,
  referredUserId: string
): Promise<void> {
  logStep("Processing influencer commission", { influencerId, amountInCents, transactionId });

  // Check for duplicate commission
  const { data: existingCommission } = await supabase
    .from("commissions")
    .select("id")
    .eq("source_transaction_id", transactionId)
    .single();

  if (existingCommission) {
    logStep("Commission already recorded for this transaction", { transactionId });
    return;
  }

  // Get influencer details
  const { data: influencer, error: influencerError } = await supabase
    .from("influencers")
    .select("id, commission_rate, pending_balance")
    .eq("id", influencerId)
    .single();

  if (influencerError || !influencer) {
    logStep("Influencer not found", { influencerId, error: influencerError?.message });
    return;
  }

  // Calculate commission: 10% of net (after Stripe's ~2.9% + $0.30)
  // Stripe fee approximation: 2.9% + 30 cents
  const stripeFee = Math.round(amountInCents * 0.029) + 30;
  const netAmount = amountInCents - stripeFee;
  const commissionRate = Number(influencer.commission_rate) || 0.10;
  const commissionAmount = Number(((netAmount / 100) * commissionRate).toFixed(2));

  logStep("Commission calculation", { 
    grossAmount: amountInCents / 100,
    stripeFee: stripeFee / 100,
    netAmount: netAmount / 100,
    commissionRate,
    commissionAmount 
  });

  // Find or create referral record
  let referralId: string | null = null;
  const { data: existingReferral } = await supabase
    .from("referrals")
    .select("id")
    .eq("influencer_id", influencerId)
    .eq("referred_user_id", referredUserId)
    .single();

  if (existingReferral) {
    referralId = existingReferral.id;
    
    // Update referral status to active/converted
    await supabase
      .from("referrals")
      .update({ status: "active", converted_at: new Date().toISOString() })
      .eq("id", referralId);
  }

  // Insert commission record
  await withRetry(async () => {
    const { error } = await supabase.from("commissions").insert({
      influencer_id: influencerId,
      referral_id: referralId,
      amount: commissionAmount,
      source_transaction_id: transactionId,
      status: "pending",
    });
    if (error) throw error;
  });

  // Update influencer pending balance
  const newPendingBalance = Number(influencer.pending_balance) + commissionAmount;
  
  await withRetry(async () => {
    const { error } = await supabase
      .from("influencers")
      .update({ pending_balance: newPendingBalance })
      .eq("id", influencerId);
    if (error) throw error;
  });

  logStep("Commission recorded", { influencerId, commissionAmount, newPendingBalance });
}
