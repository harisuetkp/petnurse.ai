import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-ADD-INFLUENCER] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    logStep("Function started");

    // Validate authentication via Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Create Supabase client with anon key for JWT validation
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate JWT using getClaims
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      logStep("User authentication failed", { error: claimsError?.message });
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const currentUserId = claimsData.claims.sub as string;

    // Create Supabase client with service role for admin operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    logStep("User authenticated", { userId: currentUserId });

    // Verify admin role
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc("has_role", {
      _user_id: currentUserId,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      logStep("Admin check failed", { isAdmin, error: roleError?.message });
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    logStep("Admin access verified");

    // Parse request body
    const { email, name, promoCode, commissionRate = 0.10 } = await req.json();

    if (!email || !promoCode || !name) {
      return new Response(
        JSON.stringify({ error: "Name, email and promo code are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Request parameters", { email, name, promoCode, commissionRate });

    // Use Supabase Admin API to list users directly
    const { data: usersData, error: usersError } = await supabaseClient.auth.admin.listUsers({
      perPage: 1000,
    });
    
    if (usersError) {
      logStep("Failed to list users", { error: usersError.message });
      return new Response(
        JSON.stringify({ error: "Failed to lookup users" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const user = usersData.users.find((u) => 
      u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      logStep("User not found", { email });
      return new Response(
        JSON.stringify({ error: `No user found with email: ${email}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const targetUserId = user.id;
    logStep("Found user", { userId: targetUserId });

    // Check if user is already an influencer
    const { data: existingInfluencer } = await supabaseClient
      .from("influencers")
      .select("id, promo_code")
      .eq("user_id", targetUserId)
      .single();

    if (existingInfluencer) {
      const existing = existingInfluencer as { id: string; promo_code: string };
      return new Response(
        JSON.stringify({ 
          error: "User is already an influencer",
          existingPromoCode: existing.promo_code 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
      );
    }

    // Check if promo code is already in use
    const { data: existingCode } = await supabaseClient
      .from("influencers")
      .select("id")
      .ilike("promo_code", promoCode)
      .single();

    if (existingCode) {
      return new Response(
        JSON.stringify({ error: "Promo code is already in use" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
      );
    }

    // Create the influencer record
    const { data: newInfluencer, error: insertError } = await supabaseClient
      .from("influencers")
      .insert({
        user_id: targetUserId,
        name: name,
        promo_code: promoCode.toUpperCase(),
        commission_rate: commissionRate,
        is_active: true,
        pending_balance: 0,
        total_earned: 0,
      })
      .select()
      .single();

    if (insertError) {
      logStep("Failed to create influencer", { error: insertError.message });
      return new Response(
        JSON.stringify({ error: "Failed to create influencer record" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const influencer = newInfluencer as { id: string; user_id: string; name: string; promo_code: string; commission_rate: number };
    logStep("Influencer created successfully", { 
      influencerId: influencer.id, 
      name: influencer.name,
      promoCode: influencer.promo_code 
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        influencer: {
          id: influencer.id,
          userId: influencer.user_id,
          name: influencer.name,
          promoCode: influencer.promo_code,
          commissionRate: influencer.commission_rate,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 201 }
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
