import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate: only allow admin users or service-role calls (e.g. pg_cron)
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") ?? "";
    const isServiceRole = token === SUPABASE_SERVICE_ROLE_KEY;

    if (!isServiceRole) {
      // Check if caller is an authenticated admin
      const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      });
      const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Authentication required" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roles } = await supabaseAuth
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .limit(1);
      if (!roles || roles.length === 0) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Get all pets with their owners
    const { data: pets, error: petsError } = await supabase
      .from("pets")
      .select("id, name, species, breed, age, weight, owner_id");

    if (petsError) throw petsError;
    if (!pets || pets.length === 0) {
      return new Response(JSON.stringify({ message: "No pets found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Search veterinary knowledge base for relevant content
    let knowledgeContext = "";
    try {
      const embeddingRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: "weekly pet care recommendations health tips preventive care",
          dimensions: 768,
        }),
      });

      if (embeddingRes.ok) {
        const embData = await embeddingRes.json();
        const embedding = embData.data?.[0]?.embedding;
        if (embedding) {
          const { data: knowledge } = await supabase.rpc("search_veterinary_knowledge", {
            query_embedding: `[${embedding.join(",")}]`,
            match_threshold: 0.3,
            match_count: 10,
          });
          if (knowledge?.length) {
            knowledgeContext = knowledge
              .map((k: any) => `[${k.category}] ${k.title}: ${k.content}`)
              .join("\n\n");
          }
        }
      }
    } catch (e) {
      console.log("Knowledge base search failed, proceeding without:", e);
    }

    // Group pets by owner
    const petsByOwner: Record<string, typeof pets> = {};
    for (const pet of pets) {
      if (!petsByOwner[pet.owner_id]) petsByOwner[pet.owner_id] = [];
      petsByOwner[pet.owner_id].push(pet);
    }

    let totalRecommendations = 0;

    for (const [ownerId, ownerPets] of Object.entries(petsByOwner)) {
      for (const pet of ownerPets) {
        // Check if we already sent a recommendation this week
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: existing } = await supabase
          .from("pet_recommendations")
          .select("id")
          .eq("pet_id", pet.id)
          .gte("created_at", oneWeekAgo)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const petDescription = `${pet.species}${pet.breed ? ` (${pet.breed})` : ""}${pet.age ? `, ${pet.age} years old` : ""}${pet.weight ? `, ${pet.weight} lbs` : ""} named ${pet.name}`;

        const prompt = `You are a veterinary care advisor. Based on the following pet profile and veterinary knowledge, generate ONE specific, actionable weekly care recommendation.

Pet: ${petDescription}

${knowledgeContext ? `Veterinary Knowledge Base:\n${knowledgeContext}\n\n` : ""}

Consider the pet's breed-specific needs, age-appropriate care, and seasonal factors (current month: ${new Date().toLocaleString("en-US", { month: "long" })}). 

Respond in JSON format:
{
  "title": "Short title (max 60 chars)",
  "content": "Detailed recommendation (2-3 sentences, practical and specific to this pet's breed/age)",
  "category": "one of: nutrition, exercise, grooming, dental, preventive, mental_health, seasonal"
}`;

        try {
          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.7,
              response_format: { type: "json_object" },
            }),
          });

          if (!aiRes.ok) {
            console.error(`AI request failed for pet ${pet.id}:`, await aiRes.text());
            continue;
          }

          const aiData = await aiRes.json();
          const rawContent = aiData.choices?.[0]?.message?.content;
          if (!rawContent) continue;

          const recommendation = JSON.parse(rawContent);

          await supabase.from("pet_recommendations").insert({
            user_id: ownerId,
            pet_id: pet.id,
            title: recommendation.title?.slice(0, 100) || "Weekly Care Tip",
            content: recommendation.content?.slice(0, 1000) || "",
            category: recommendation.category || "general",
          });

          totalRecommendations++;
        } catch (e) {
          console.error(`Failed to generate recommendation for pet ${pet.id}:`, e);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, recommendations_created: totalRecommendations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
