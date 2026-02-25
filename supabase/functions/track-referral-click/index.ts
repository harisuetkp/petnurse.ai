import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TRACK-CLICK] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    // Rate limit by IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const rateLimitResult = checkRateLimit(`click:${clientIp}`, 30); // 30 clicks per minute
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(corsHeaders, rateLimitResult.resetAt);
    }
    
    logStep("Function started");
    
    const { promoCode, userAgent } = await req.json();
    
    if (!promoCode) {
      return new Response(
        JSON.stringify({ error: "Promo code required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    
    // Find the influencer
    const { data: influencer, error: findError } = await supabaseClient
      .from("influencers")
      .select("id")
      .ilike("promo_code", promoCode)
      .eq("is_active", true)
      .single();
    
    if (findError || !influencer) {
      logStep("Influencer not found", { promoCode });
      return new Response(
        JSON.stringify({ error: "Invalid promo code" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
    
    // Hash the IP for privacy
    const encoder = new TextEncoder();
    const data = encoder.encode(clientIp + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const ipHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Record the click
    const { error: insertError } = await supabaseClient
      .from("referral_clicks")
      .insert({
        influencer_id: influencer.id,
        ip_hash: ipHash.substring(0, 64),
        user_agent: userAgent?.substring(0, 500) || null,
      });
    
    if (insertError) {
      logStep("Insert error", { error: insertError.message });
      throw insertError;
    }
    
    logStep("Click tracked", { influencerId: influencer.id });
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: "Failed to track click" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
