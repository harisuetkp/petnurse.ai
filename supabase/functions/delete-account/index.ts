import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a client with the user's JWT to verify identity
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user with their JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      console.error("User verification failed:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log(`Deleting account for user: ${userId}`);

    // Create admin client to delete user data and account
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Delete user data from all tables (CASCADE should handle most, but be explicit)
    // The foreign keys with ON DELETE CASCADE should clean up related data
    
    // Delete pets
    const { error: petsError } = await adminClient
      .from("pets")
      .delete()
      .eq("owner_id", userId);
    if (petsError) console.error("Error deleting pets:", petsError);

    // Delete triage history
    const { error: triageError } = await adminClient
      .from("triage_history")
      .delete()
      .eq("user_id", userId);
    if (triageError) console.error("Error deleting triage history:", triageError);

    // Delete profile
    const { error: profileError } = await adminClient
      .from("profiles")
      .delete()
      .eq("user_id", userId);
    if (profileError) console.error("Error deleting profile:", profileError);

    // Delete user roles
    const { error: rolesError } = await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", userId);
    if (rolesError) console.error("Error deleting user roles:", rolesError);

    // Delete admin messages for this user
    const { error: messagesError } = await adminClient
      .from("admin_messages")
      .delete()
      .eq("recipient_id", userId);
    if (messagesError) console.error("Error deleting admin messages:", messagesError);

    // Check if user is an influencer and handle that
    const { data: influencer } = await adminClient
      .from("influencers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (influencer) {
      // Delete commissions
      await adminClient
        .from("commissions")
        .delete()
        .eq("influencer_id", influencer.id);

      // Delete referral clicks
      await adminClient
        .from("referral_clicks")
        .delete()
        .eq("influencer_id", influencer.id);

      // Delete referrals
      await adminClient
        .from("referrals")
        .delete()
        .eq("influencer_id", influencer.id);

      // Delete influencer record
      await adminClient
        .from("influencers")
        .delete()
        .eq("user_id", userId);
    }

    // Finally, delete the user from auth.users
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Error deleting user from auth:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully deleted account for user: ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
