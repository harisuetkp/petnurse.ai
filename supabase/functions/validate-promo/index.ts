import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VALIDATE-PROMO] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    logStep("Function started");

    // Rate limit by IP - 20 requests per minute
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimit = checkRateLimit(`promo:${clientIP}`, 20);
    if (!rateLimit.allowed) {
      return rateLimitResponse(corsHeaders, rateLimit.resetAt);
    }
    
    const { promoCode } = await req.json();
    
    if (!promoCode || typeof promoCode !== "string") {
      return new Response(
        JSON.stringify({ valid: false, error: "Promo code required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    logStep("Validating promo code", { code: promoCode.toUpperCase() });
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    
    // Use the RPC function to validate
    const { data, error } = await supabaseClient
      .rpc('validate_promo_code', { code: promoCode });
    
    if (error) {
      logStep("Database error", { error: error.message });
      throw error;
    }
    
    const result = data?.[0];
    
    if (!result || !result.is_valid) {
      logStep("Invalid promo code");
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid or inactive promo code" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    logStep("Promo code valid", { influencerId: result.influencer_id });
    
    // Note: commission_rate is no longer exposed via RPC for security
    // The frontend displays a standard 10% discount message
    // Actual commission calculation happens securely in stripe-webhook
    return new Response(
      JSON.stringify({
        valid: true,
        influencerId: result.influencer_id,
        discountPercent: 10, // Standard promotional discount shown to users
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ valid: false, error: "Failed to validate promo code" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
