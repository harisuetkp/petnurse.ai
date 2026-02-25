import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Verify admin
  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: hasAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!hasAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Find ALL published posts without valid og_image_url
    const { data: posts, error } = await supabase
      .from("blog_posts")
      .select("id, title, slug, category, og_image_url")
      .eq("published", true)
      .order("published_at", { ascending: false });

    if (error) throw error;

    const postsNeedingImages = (posts || []).filter(
      (p) => !p.og_image_url || !p.og_image_url.startsWith("https://") || !p.og_image_url.includes("/storage/")
    );

    if (postsNeedingImages.length === 0) {
      return new Response(
        JSON.stringify({ message: "All posts have images", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process max 3 at a time to avoid timeout
    const batch = postsNeedingImages.slice(0, 3);
    console.log(`Generating images for ${batch.length} of ${postsNeedingImages.length} posts (batch mode)`);
    const results: any[] = [];

    for (const post of batch) {
      try {
        console.log(`Generating image for: "${post.title}"`);

        const petContext = post.category?.toLowerCase().includes("cat") ? "cat" : "dog and cat";
        const imagePrompt = `Generate a professional pet health article hero image in 16:9 landscape format. Show a calm, caring scene with a healthy ${petContext} being gently examined or cared for by a kind veterinary professional. Clean clinical yet warm aesthetic with soft natural lighting. The image should subtly evoke the theme: "${post.title}". No text overlays. Photorealistic, shallow depth of field.`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-pro-image-preview",
            messages: [{ role: "user", content: imagePrompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => "");
          console.warn(`Image API returned ${response.status} for "${post.title}": ${errorBody}`);
          results.push({ id: post.id, title: post.title, error: `API ${response.status}` });
          continue;
        }

        const data = await response.json();
        
        // Try multiple possible response formats
        let imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!imageUrl) {
          // Check inline_data format
          const parts = data.choices?.[0]?.message?.content;
          if (Array.isArray(parts)) {
            const imgPart = parts.find((p: any) => p.type === "image_url" || p.inline_data);
            if (imgPart?.image_url?.url) imageUrl = imgPart.image_url.url;
            else if (imgPart?.inline_data) {
              imageUrl = `data:${imgPart.inline_data.mime_type};base64,${imgPart.inline_data.data}`;
            }
          }
        }

        if (!imageUrl || !imageUrl.startsWith("data:image/")) {
          console.warn(`No valid image for "${post.title}", response keys: ${JSON.stringify(Object.keys(data))}`);
          results.push({ id: post.id, title: post.title, error: "No image returned" });
          continue;
        }

        // Upload to storage
        const match = imageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!match) {
          results.push({ id: post.id, title: post.title, error: "Invalid base64" });
          continue;
        }

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
          results.push({ id: post.id, title: post.title, error: "Upload failed" });
          continue;
        }

        const publicUrl = `${supabaseUrl}/storage/v1/object/public/blog-images/${fileName}`;

        // Update the post
        await supabase
          .from("blog_posts")
          .update({ og_image_url: publicUrl })
          .eq("id", post.id);

        console.log(`✅ Image uploaded for "${post.title}": ${publicUrl}`);
        results.push({ id: post.id, title: post.title, og_image_url: publicUrl, success: true });
      } catch (err) {
        console.error(`Failed for "${post.title}":`, err);
        results.push({ id: post.id, title: post.title, error: err instanceof Error ? err.message : "Unknown" });
      }
    }

    return new Response(
      JSON.stringify({ success: true, generated: results.filter((r) => r.success).length, total: postsNeedingImages.length, remaining: postsNeedingImages.length - batch.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("backfill-blog-images error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
