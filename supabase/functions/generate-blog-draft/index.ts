import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Safety validation patterns
const SAFETY_VIOLATIONS = [
  { pattern: /\b(diagnos(?:e|ed|is|ing))\b/gi, rule: "Contains diagnostic language" },
  { pattern: /\b(\d+\s*(?:mg|ml|cc|mcg|iu)\b)/gi, rule: "Contains medication dosage" },
  { pattern: /\b(give|administer|prescribe)\s+(?:your pet|your dog|your cat|them)\s+\d/gi, rule: "Contains treatment instruction with dosage" },
  { pattern: /\b(study\s+(?:shows?|found|published|by)\s)/gi, rule: "Potentially fabricated study reference" },
  { pattern: /\b(\d{1,3}(?:\.\d+)?%\s+of\s+(?:dogs?|cats?|pets?))/gi, rule: "Contains potentially fabricated statistic" },
];

function validateSafety(content: string): { passed: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const check of SAFETY_VIOLATIONS) {
    const matches = content.match(check.pattern);
    if (matches) {
      violations.push(`${check.rule}: "${matches[0]}"`);
    }
  }
  const requiredSections = [
    { pattern: /emergency\s+vet\s+now\s+if/i, name: "Emergency vet section" },
    { pattern: /disclaimer/i, name: "Professional disclaimer" },
    { pattern: /when\s+to\s+see\s+a\s+vet/i, name: "When to See a Vet section" },
  ];
  for (const section of requiredSections) {
    if (!section.pattern.test(content)) {
      violations.push(`Missing required section: ${section.name}`);
    }
  }
  return { passed: violations.length === 0, violations };
}

// Generate a hero image for the blog post using Lovable AI image model
async function generateBlogImage(
  lovableApiKey: string,
  title: string,
  petType: string,
  keyword: string
): Promise<string | null> {
  try {
    const petContext = petType === "both" ? "dog and cat" : petType === "dog" ? "dog" : "cat";
    const imagePrompt = `Professional pet health article hero image, 16:9 landscape. A calm, caring scene showing a healthy ${petContext} being gently examined or cared for by a kind veterinary professional. Clean, clinical yet warm aesthetic. Soft natural lighting. The image should subtly evoke the theme: "${keyword}". No text overlays. Ultra high resolution, photorealistic, shallow depth of field.`;

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
      console.warn("Image generation API returned:", response.status);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl || !imageUrl.startsWith("data:image/")) {
      console.warn("No valid image returned from AI");
      return null;
    }

    return imageUrl;
  } catch (err) {
    console.warn("Image generation failed:", err);
    return null;
  }
}

// Upload base64 image to Supabase storage and return public URL
async function uploadImageToStorage(
  supabase: any,
  base64DataUrl: string,
  postSlug: string,
  supabaseUrl: string
): Promise<string | null> {
  try {
    // Extract the base64 content and mime type
    const match = base64DataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return null;

    const mimeType = match[1];
    const base64Data = match[2];
    const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
    const fileName = `${postSlug}-${Date.now()}.${ext}`;

    // Decode base64 to Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const { error } = await supabase.storage
      .from("blog-images")
      .upload(fileName, bytes, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.warn("Storage upload error:", error);
      return null;
    }

    // Return the public URL
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/blog-images/${fileName}`;
    return publicUrl;
  } catch (err) {
    console.warn("Image upload failed:", err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Pick the top 2 highest-priority queued topics
    const { data: topics, error: topicError } = await supabase
      .from("blog_topic_queue")
      .select("*")
      .eq("status", "queued")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(2);

    if (topicError) throw topicError;

    if (!topics || topics.length === 0) {
      console.log("No queued topics found. Skipping generation.");
      return new Response(JSON.stringify({ message: "No queued topics" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing ${topics.length} topic(s) for draft generation`);

    const results: any[] = [];

    for (const topic of topics) {
      try {
        console.log(`Generating draft for topic: "${topic.title}" (keyword: ${topic.target_keyword})`);

        // Fetch existing published posts for internal linking
        const { data: existingPosts } = await supabase
          .from("blog_posts")
          .select("title, slug, category")
          .eq("published", true)
          .order("published_at", { ascending: false })
          .limit(30);

        const internalLinksContext = existingPosts && existingPosts.length > 0
          ? `\n\nINTERNAL LINKING — You MUST naturally link to 2-4 of these existing published articles within your content using descriptive anchor text. Use the full URL format https://petnurseai.com/blog/{slug}:\n${existingPosts.map(p => `- "${p.title}" → https://petnurseai.com/blog/${p.slug} [${p.category}]`).join("\n")}`
          : "";

        const petContext = topic.pet_type === "both" 
          ? "dogs and cats" 
          : topic.pet_type === "dog" ? "dogs" : "cats";

        const systemPrompt = `You are a senior veterinary content writer AND SEO expert for PetNurse AI (petnurseai.com), a clinical pet health platform. You write evidence-based, professionally-toned articles optimized for Google search ranking.

AI BLOG WRITING RULES (MANDATORY — FOLLOW EVERY RULE WITHOUT EXCEPTION):
1. NEVER diagnose. You are not a veterinarian. Never state or imply a diagnosis. Use "possible causes", "may indicate", "could suggest".
2. USE CAUTIOUS LANGUAGE throughout: "may", "can", "possible", "could suggest", "often seen if". Never claim certainty.
3. NEVER provide medication dosages or specific treatment instructions. Monitoring steps only.
4. ALWAYS include an "Emergency vet now if…" section with specific red-flag scenarios.
5. NEVER invent statistics, percentages, or cite fake/fabricated studies or sources.
6. NEVER reference fake studies or make up research findings.
7. Keep tone clinical, calm, and responsible — like a senior vet nurse explaining to a concerned pet owner.
8. FOLLOW THE STRICT BLOG TEMPLATE EXACTLY — every numbered section must appear in order.
9. ALWAYS include the full professional disclaimer at the end.
10. NEVER use consumer-style marketing language or casual emojis.
11. Use "structured triage assessment" not "diagnosis" or "test".
12. Naturally mention PetNurse AI (petnurseai.com) as a helpful resource for pet owners — weave it in where clinically appropriate, not as a hard sell.

SEO OPTIMIZATION RULES (MANDATORY — FOLLOW ALL):
13. Place the PRIMARY KEYWORD in the first 100 words of the article, in the conclusion/CTA section, and in at least 2 H2 or H3 headings.
14. Use the primary keyword naturally 4-6 times across the full article (roughly 0.3-0.5% keyword density). Never keyword-stuff.
15. Include 5-8 LSI (Latent Semantic Indexing) / semantically related keywords naturally throughout the content. These are related terms Google uses to understand topic depth (e.g. for "dog vomiting": "nausea in dogs", "upset stomach", "bile", "dehydration", "regurgitation", "gastrointestinal").
16. Use LONG-TAIL keyword variations in FAQ questions (e.g. "why is my dog vomiting yellow bile in the morning", "when should I take my cat to the vet for vomiting").
17. Write H2/H3 headings as natural search queries when possible — these rank as featured snippets.
18. Use semantic HTML structure: proper heading hierarchy (H1 > H2 > H3), descriptive alt-text concepts in content, and logical content flow.
19. Write a compelling first paragraph that directly answers the search query (optimized for Google's featured snippet / position zero).
20. INTERNAL LINKING: Link to 2-4 existing related articles from PetNurse AI's blog using keyword-rich anchor text. This is a critical ranking signal.
21. Use transition words and short paragraphs (2-3 sentences max) for readability — Google rewards high dwell time.
22. Add descriptive, keyword-rich anchor text for all links (never "click here").
23. IMAGE ALT TEXT: If you include any <img> tags, always add descriptive, keyword-rich alt attributes (e.g. alt="dog vomiting yellow bile symptoms"). Even for decorative images, use meaningful alt text with the target keyword.`;

        const userPrompt = `Write a comprehensive clinical blog article about: "${topic.title}"

Target keyword: "${topic.target_keyword}"
Pet type focus: ${petContext}
${internalLinksContext}

Use this EXACT structure with HTML formatting:

1. <h2>Quick Answer</h2>
   Structure this section with these 4 sub-parts:
   <h3>Most common explanation</h3> — 1-2 calm sentences explaining the most likely cause.
   <h3>Can it be serious?</h3> — Clear yes/no with brief context.
   <h3>What to do next</h3> — A <ul> with 3 actionable steps. One step should mention using PetNurse AI's symptom check at petnurseai.com as an option.
   <h3>Go to emergency vet now if:</h3> — A <ul> with 3 red-flag scenarios in a red callout box: <div class="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg my-4">
   End with: <p class="text-sm text-muted-foreground italic mt-3">This article provides informational guidance, not a veterinary diagnosis. For a structured triage assessment, visit <a href="https://petnurseai.com/triage" class="text-primary underline">PetNurse AI</a>.</p>

2. <h2>What You're Seeing</h2>
   Explain what this symptom looks like, how long it may last, and common symptom combinations (e.g. vomiting + lethargy).
   Then add a checklist in a blue callout box <div class="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg my-4"> with these items as a <ul>:
   • Appetite changes?
   • Drinking changes?
   • Energy level?
   • Bathroom habits?
   • Signs of pain?

3. <h2>Common Causes</h2>
   List 5-8 cautious possibilities using <ol>. Each item: <strong>Cause name</strong> — 1-2 sentence explanation.
   MANDATORY language rules: use "can happen when…", "may be related to…", "often seen if…". NEVER claim certainty or use definitive diagnostic language.

4. <h2>Risk Breakdown</h2>
   Use 3 sub-sections with colored callout boxes:
   <h3>Low Concern (Monitor)</h3> in a green callout box <div class="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg my-4"> with <ul> bullet points.
   <h3>Moderate Concern (Contact Vet Soon)</h3> in an amber callout box <div class="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg my-4"> with <ul> bullet points.
   <h3>High Concern (Emergency)</h3> in a red callout box <div class="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg my-4"> with <ul> bullet points.

5. <h2>Safe Home Monitoring Steps</h2>
   List ONLY safe monitoring actions in <ul>: monitor hydration, remove harmful items, track frequency, offer rest.
   CRITICAL: NO medication dosing. NO strong treatment instructions. Add a blue callout box noting these are monitoring steps only, not treatment.

6. <h2>What NOT to Do</h2>
   Use <ul> with items like: Don't give human medications, Don't ignore red flags, Don't delay care if symptoms worsen. Keep it brief and direct.

7. <h2>When to See a Vet</h2>
   Two sub-sections:
   <h3>See a vet today if:</h3> — <ul> with 3-4 bullet points.
   <h3>Emergency vet now if:</h3> — <ul> with 3-4 bullet points in a red callout box.

8. <h2>Questions to Ask Your Vet</h2>
   4-5 practical questions in <ol>. Examples: "Could this be related to…?", "What warning signs should I watch?", "Do any tests need to be done?"

9. <h2>Frequently Asked Questions</h2>
   5-8 FAQs using <h3> for each question and <p> for answers. Calm, cautious tone. These should also be included in the structured FAQs JSON for schema markup.

10. <h3>Professional Disclaimer</h3>
    In amber callout box: <div class="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg my-4">.
    Text: "This content is brought to you by <a href='https://petnurseai.com' class='text-primary font-semibold underline'>PetNurse AI</a> and provides general information only. It does not replace professional veterinary diagnosis or treatment. If your pet is in distress, seek emergency veterinary care immediately."

11. Soft CTA at the end:
    <div class="bg-primary/5 border border-primary/20 p-6 rounded-xl my-6 text-center">
    <p class="font-semibold text-foreground mb-2">Worried about your pet's symptoms?</p>
    <p class="text-muted-foreground text-sm mb-3">PetNurse AI provides free structured triage assessments based on your pet's exact symptoms — available 24/7 at <a href="https://petnurseai.com" class="text-primary font-semibold underline">petnurseai.com</a>.</p>
    <a href="https://petnurseai.com/triage" class="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium text-sm hover:opacity-90 transition">Start Free Symptom Check →</a>
    </div>

12. Author signature at the very end:
    <div class="mt-8 pt-6 border-t border-border">
    <p class="text-sm text-muted-foreground">Written by <strong>PetNurse Clinical Team</strong></p>
    </div>

SEO & CONTENT REQUIREMENTS:
- Title (H1) should be the exact search-style question from the topic title — this is your primary keyword target
- Write 1500-2200 words (longer content ranks higher for competitive health keywords)
- Use proper HTML tags (h2, h3, p, ul, ol, li, strong) with semantic hierarchy
- Include callout boxes for warnings and important notes
- Be specific to ${petContext}
- PRIMARY KEYWORD "${topic.target_keyword}": use 4-6 times naturally — in first paragraph, at least 2 headings, and conclusion
- Include 5-8 LSI/related keywords naturally (synonyms, related medical terms, common misspellings pet owners use)
- Write FAQ questions as LONG-TAIL search queries that real pet owners type into Google
- Use <strong> tags to emphasize key phrases that contain the target keyword or LSI terms
- Add descriptive, keyword-rich <a> anchor text (not generic "click here")
- First paragraph must directly answer the search query in 2-3 sentences (featured snippet optimization)
- Keep paragraphs short (2-3 sentences) for mobile readability and dwell time
- Naturally reference PetNurse AI (petnurseai.com) 2-3 times throughout the article where it makes clinical sense
- Output ONLY the HTML content, no markdown fences`;

        const seoPrompt = `Based on this blog article topic: "${topic.title}" (keyword: "${topic.target_keyword}", for ${petContext}):

Generate the following as a JSON object using the tool provided:
1. meta_title: SEO title under 60 characters. MUST include the primary keyword "${topic.target_keyword}" near the beginning. Append "| PetNurse AI" if space allows. Use power words like "Guide", "Signs", "When to Worry".
2. meta_description: SEO description under 155 characters. Include the primary keyword, a benefit/value prop, and a call-to-action. Must be compelling enough to maximize CTR. Mention PetNurse AI.
3. slug: URL-friendly slug derived from the keyword (short, keyword-rich, no stop words). Example: "dog-vomiting-causes-when-to-worry" not "what-should-i-do-if-my-dog-is-vomiting".
4. excerpt: 1-2 sentence summary for blog listing cards. Include the primary keyword naturally.
5. faqs: Array of 6-10 FAQ objects with "question" and "answer" fields. Questions MUST be long-tail search queries real pet owners type into Google (e.g. "why is my dog vomiting yellow bile every morning", "can I give my cat pepto bismol for upset stomach"). Answers should be 2-3 sentences, cautious, clinical, and include related keywords.
6. lsi_keywords: Array of 8-12 LSI (semantically related) keywords/phrases that Google associates with this topic. Include synonyms, medical terms, common misspellings, and related search queries. Example for "dog vomiting": ["nausea in dogs", "bile vomit", "upset stomach dog", "regurgitation vs vomiting", "dehydration signs dogs", "when to worry about dog throwing up", "gastritis in dogs", "dog stomach issues"].
7. tags: Array of 6-10 SEO tags for this article. Include the primary keyword, pet type, category, related conditions, and trending search terms. Example: ["dog vomiting", "dog health", "emergency vet", "upset stomach", "when to see vet", "dog nausea", "bile vomiting"].`;

        // Generate content and SEO in parallel
        const [contentResponse, seoResponse] = await Promise.all([
          fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
            }),
          }),
          fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: "You are an SEO specialist for veterinary content. Return structured data using the tool provided." },
                { role: "user", content: seoPrompt },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "generate_seo_data",
                    description: "Generate SEO metadata and FAQs for a blog post",
                    parameters: {
                      type: "object",
                      properties: {
                        meta_title: { type: "string", description: "SEO title under 60 chars" },
                        meta_description: { type: "string", description: "SEO description under 160 chars" },
                        slug: { type: "string", description: "URL-friendly slug" },
                        excerpt: { type: "string", description: "1-2 sentence summary" },
                        faqs: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              question: { type: "string" },
                              answer: { type: "string" },
                            },
                            required: ["question", "answer"],
                          },
                        },
                        lsi_keywords: {
                          type: "array",
                          items: { type: "string" },
                          description: "8-12 LSI/semantically related keywords",
                        },
                        tags: {
                          type: "array",
                          items: { type: "string" },
                          description: "6-10 SEO tags for the article",
                        },
                      },
                      required: ["meta_title", "meta_description", "slug", "excerpt", "faqs", "lsi_keywords", "tags"],
                    },
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: "generate_seo_data" } },
            }),
          }),
        ]);

        if (!contentResponse.ok) {
          const errText = await contentResponse.text();
          console.error("Content generation failed:", contentResponse.status, errText);
          await logGenerationFailure(supabase, topic, `Content API returned ${contentResponse.status}: ${errText.substring(0, 200)}`);
          if (contentResponse.status === 429) {
            results.push({ topic_id: topic.id, error: "Rate limited" });
            continue;
          }
          results.push({ topic_id: topic.id, error: `Content generation failed: ${contentResponse.status}` });
          continue;
        }

        if (!seoResponse.ok) {
          const errText = await seoResponse.text();
          console.error("SEO generation failed:", seoResponse.status, errText);
          await logGenerationFailure(supabase, topic, `SEO API returned ${seoResponse.status}: ${errText.substring(0, 200)}`);
          results.push({ topic_id: topic.id, error: `SEO generation failed: ${seoResponse.status}` });
          continue;
        }

        const contentData = await contentResponse.json();
        const seoData = await seoResponse.json();

        const content = contentData.choices?.[0]?.message?.content || "";
        
        // === SAFETY VALIDATION ===
        const safetyResult = validateSafety(content);
        if (!safetyResult.passed) {
          console.warn("Safety violations detected:", safetyResult.violations);
          await supabase.from("admin_messages").insert({
            subject: "⚠️ Blog draft has safety warnings — needs review",
            content: `The AI-generated draft for "${topic.title}" has the following safety concerns:\n\n${safetyResult.violations.map((v) => `• ${v}`).join("\n")}\n\nPlease review and edit before publishing.`,
            sender_id: null,
            recipient_id: null,
          });
        }
        
        // Extract SEO data from tool call
        let seoFields = { meta_title: topic.title, meta_description: "", slug: "", excerpt: "", faqs: [] as any[], lsi_keywords: [] as string[], tags: [] as string[] };
        try {
          const toolCall = seoData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            const parsed = JSON.parse(toolCall.function.arguments);
            seoFields = { ...seoFields, ...parsed };
          }
        } catch (e) {
          console.warn("Failed to parse SEO tool call, using defaults:", e);
          seoFields.slug = topic.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        }

        if (!seoFields.slug) {
          seoFields.slug = topic.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        }
        seoFields.slug = `${seoFields.slug}-${Date.now().toString(36)}`;

        // Determine category
        const categoryMap: Record<string, string> = {
          allerg: "Wellness", vomit: "Emergency", diarrhea: "Emergency",
          seizure: "Emergency", poison: "Toxicology", toxic: "Toxicology",
          arthritis: "Senior Care", behavior: "Behavior", biting: "Behavior",
          scooting: "Behavior", nutrition: "Nutrition", food: "Nutrition",
          vaccine: "Prevention",
        };
        let category = "Wellness";
        const lowerTitle = topic.title.toLowerCase();
        for (const [key, cat] of Object.entries(categoryMap)) {
          if (lowerTitle.includes(key)) { category = cat; break; }
        }

        // === GENERATE HERO IMAGE ===
        console.log(`Generating hero image for: "${topic.title}"`);
        let ogImageUrl: string | null = null;
        try {
          const imageBase64 = await generateBlogImage(lovableApiKey, topic.title, topic.pet_type, topic.target_keyword);
          if (imageBase64) {
            ogImageUrl = await uploadImageToStorage(supabase, imageBase64, seoFields.slug, supabaseUrl);
            if (ogImageUrl) {
              console.log(`Hero image uploaded: ${ogImageUrl}`);
            }
          }
        } catch (imgErr) {
          console.warn("Image generation/upload failed (non-fatal):", imgErr);
        }

        // Save as draft blog post
        const { data: newPost, error: insertError } = await supabase
          .from("blog_posts")
          .insert({
            title: topic.title,
            slug: seoFields.slug,
            content: content,
            excerpt: seoFields.excerpt || null,
            category,
            author_name: "PetNurse Clinical Team",
            published: false,
            meta_title: seoFields.meta_title || null,
            meta_description: seoFields.meta_description || null,
            faqs: seoFields.faqs,
            og_image_url: ogImageUrl,
            tags: seoFields.tags.length > 0 
              ? [...new Set([topic.target_keyword, ...seoFields.tags, topic.pet_type, "ai-generated"])]
              : [topic.target_keyword, topic.pet_type, "ai-generated"],
          })
          .select("id")
          .single();

        if (insertError) throw insertError;

        const { error: updateError } = await supabase
          .from("blog_topic_queue")
          .update({ status: "drafted", generated_post_id: newPost.id })
          .eq("id", topic.id);

        if (updateError) throw updateError;

        const safetyNote = safetyResult.passed 
          ? "✅ Safety validation passed." 
          : `⚠️ Safety warnings detected (${safetyResult.violations.length} issues). Review required.`;
        
        const imageNote = ogImageUrl ? "🖼️ Hero image generated and attached." : "⚠️ Hero image generation failed — please add manually.";

        await supabase.from("admin_messages").insert({
          subject: `📝 Blog draft ready: "${topic.title}"`,
          content: `A new blog draft has been generated:\n\n**"${topic.title}"**\n\nKeyword: ${topic.target_keyword}\nPet type: ${topic.pet_type}\nCategory: ${category}\n\n${safetyNote}\n${imageNote}\n\nPlease review in the Blog CMS before publishing.`,
          sender_id: null,
          recipient_id: null,
        });

        console.log(`Draft generated successfully: post ${newPost.id} for topic ${topic.id}`);
        results.push({ success: true, post_id: newPost.id, topic_id: topic.id, title: topic.title, safety: safetyResult, og_image_url: ogImageUrl });

      } catch (topicErr) {
        console.error(`Failed to generate draft for topic ${topic.id}:`, topicErr);
        await logGenerationFailure(supabase, topic, topicErr instanceof Error ? topicErr.message : "Unknown error");
        results.push({ topic_id: topic.id, error: topicErr instanceof Error ? topicErr.message : "Unknown error" });
      }
    }

    return new Response(
      JSON.stringify({ success: true, generated: results.filter(r => r.success).length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-blog-draft error:", error);
    
    try {
      await supabase.from("admin_messages").insert({
        subject: "❌ Daily blog generation FAILED",
        content: `Blog draft generation failed with error:\n\n${error instanceof Error ? error.message : "Unknown error"}\n\nThe system will retry on the next scheduled run. Check edge function logs for details.`,
        sender_id: null,
        recipient_id: null,
      });
    } catch (notifyErr) {
      console.error("Failed to send failure notification:", notifyErr);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function logGenerationFailure(supabase: any, topic: any, errorDetail: string) {
  try {
    await supabase.from("admin_messages").insert({
      subject: `❌ Blog generation failed for "${topic.title}"`,
      content: `Generation failed for topic "${topic.title}" (keyword: ${topic.target_keyword}).\n\nError: ${errorDetail}\n\nThe topic remains queued and will be retried on the next scheduled run.`,
      sender_id: null,
      recipient_id: null,
    });
  } catch (e) {
    console.error("Failed to log generation failure:", e);
  }
}
