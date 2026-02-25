import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a hero image for a blog post using Lovable AI
async function generateHeroImage(
  lovableApiKey: string,
  supabase: any,
  supabaseUrl: string,
  post: { slug: string; title: string; category: string }
): Promise<string | null> {
  try {
    const petContext = post.category?.toLowerCase().includes("cat") ? "cat" : "dog and cat";
    const imagePrompt = `Professional pet health article hero image, 16:9 landscape. A calm, caring scene showing a healthy ${petContext} being gently examined or cared for by a kind veterinary professional. Clean, clinical yet warm aesthetic. Soft natural lighting. Theme: "${post.title}". No text overlays. Ultra high resolution, photorealistic, shallow depth of field.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: imagePrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      console.warn(`Image API returned ${response.status} for "${post.title}"`);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl || !imageUrl.startsWith("data:image/")) {
      console.warn(`No valid image returned for "${post.title}"`);
      return null;
    }

    const match = imageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return null;

    const mimeType = match[1];
    const base64Data = match[2];
    const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
    const fileName = `${post.slug}-${Date.now()}.${ext}`;

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const { error: uploadError } = await supabase.storage
      .from("blog-images")
      .upload(fileName, bytes, { contentType: mimeType, upsert: false });

    if (uploadError) {
      console.warn(`Upload failed for "${post.title}":`, uploadError);
      return null;
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/blog-images/${fileName}`;
    console.log(`✅ Hero image generated for "${post.title}": ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.warn(`Image generation failed for "${post.title}":`, err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find posts scheduled before now that aren't published yet
    const now = new Date().toISOString();
    const { data: posts, error } = await supabase
      .from("blog_posts")
      .select("id, title, slug, scheduled_at, og_image_url, category")
      .eq("published", false)
      .not("scheduled_at", "is", null)
      .lte("scheduled_at", now);

    if (error) throw error;

    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ message: "No posts to publish" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const published: string[] = [];
    for (const post of posts) {
      // Auto-generate hero image if missing
      const hasImage = post.og_image_url && post.og_image_url.startsWith("https://") && post.og_image_url.includes("/storage/");
      let ogImageUrl = post.og_image_url;
      if (!hasImage && lovableApiKey) {
        console.log(`Generating hero image for "${post.title}"...`);
        const generatedUrl = await generateHeroImage(lovableApiKey, supabase, supabaseUrl, post);
        if (generatedUrl) ogImageUrl = generatedUrl;
      }

      const updatePayload: any = {
        published: true,
        published_at: post.scheduled_at,
        scheduled_at: null,
      };
      if (ogImageUrl && ogImageUrl !== post.og_image_url) {
        updatePayload.og_image_url = ogImageUrl;
      }

      const { error: updateError } = await supabase
        .from("blog_posts")
        .update(updatePayload)
        .eq("id", post.id);

      if (updateError) {
        console.error(`Failed to publish ${post.id}:`, updateError);
        continue;
      }
      published.push(post.title);
      console.log(`Auto-published: "${post.title}"`);

      // Ping Google/Bing for faster indexing
      try {
        await fetch(`${supabaseUrl}/functions/v1/ping-google`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ urls: [`https://petnurseai.com/blog/${post.slug}`] }),
        });
      } catch (pingErr) {
        console.error("Ping failed (non-blocking):", pingErr);
      }
    }

    // Notify admin
    if (published.length > 0) {
      await supabase.from("admin_messages").insert({
        subject: `📢 ${published.length} post(s) auto-published`,
        content: `The following scheduled posts have been automatically published:\n\n${published.map((t) => `• ${t}`).join("\n")}`,
        sender_id: null,
        recipient_id: null,
      });
    }

    return new Response(
      JSON.stringify({ published: published.length, titles: published }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("publish-scheduled error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
