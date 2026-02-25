import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to insert admin message (bypasses RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if welcome message already sent
    const { data: existing } = await adminClient
      .from("admin_messages")
      .select("id")
      .eq("recipient_id", user.id)
      .eq("subject", "Welcome to PetNurse AI! 🐾")
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ already_sent: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const welcomeContent = `Hi there! 👋 Welcome to PetNurse AI — your daily pet health companion. Here's how to get the most out of the app:

🐕 ADD YOUR PETS
Head to the Pets tab to add your furry family members with their photo, breed, age, and weight. This helps our AI provide personalized health insights.

📋 DAILY CHECK-INS
Complete a quick daily check-in from the Home tab to track your pet's mood, appetite, and energy. Build a streak and watch their health score over time!

🩺 AI HEALTH ASSESSMENT
Tap "Health Check" anytime your pet shows concerning symptoms. Our 6-step clinical evaluation uses veterinary AI to assess urgency and recommend next steps.

💊 CARE REMINDERS
Never miss a vaccination, medication, or vet appointment. Set up recurring reminders in the Care tab to stay on top of your pet's health schedule.

📊 HEALTH TIMELINE
View your pet's health trends over time in the Timeline tab. Track patterns in mood, energy, and symptoms to share with your vet.

🏥 FIND A VET
Use the Clinic Finder to locate nearby veterinary clinics in case of emergencies or routine visits.

⭐ GO PREMIUM
Unlock full AI triage reports, unlimited health assessments, and priority support with our affordable premium plan.

We're here to help you give your pets the best care possible. If you have any questions, don't hesitate to reach out!

— The PetNurse AI Team 🐾`;

    const { error: insertError } = await adminClient
      .from("admin_messages")
      .insert({
        recipient_id: user.id,
        sender_id: null,
        subject: "Welcome to PetNurse AI! 🐾",
        content: welcomeContent,
      });

    if (insertError) {
      console.error("Failed to send welcome message:", insertError);
      return new Response(JSON.stringify({ error: "Failed to send welcome" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Welcome function error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
